import {CREATOR_KIND,creatorOutputSchema,creatorReport} from './creator-services.js';
import {RISK_KIND,riskInput,verifyRiskReport,LOCAL_MODEL,LOCAL_MODEL_REVISION} from "./risk-analyst.js";
import {codeIdentity} from "./code-identity.js";
import { digest, verifyReport, analyze } from "./core.js";
import {
  agentDefinitions,
  isAgentKind,
  verifyChainReport,
  validateServiceInput,
} from "./agents.js";
import { verifyGroqExplanation } from "./groq.js";
import type { Service, Subscription, Receipt } from "./config.js";
import { config, rpc } from "./config.js";
export type VerificationStatus =
  | "PENDING"
  | "STRUCTURE_VALID"
  | "EVIDENCE_VALID"
  | "DELIVERY_VERIFIED"
  | "REJECTED"
  | "DISPUTED";
export function deliverySpecification(
  serviceId: string,
  service: Service,
  metadata: any,
) {
  const risk=metadata.kind===RISK_KIND,chain = isAgentKind(metadata.kind),
    example = agentDefinitions().find((d) => d.kind === metadata.kind)
      ?.input_example ?? {
      walletAddress: "example.testnet",
      holdings: [],
      totalValueUsd: 1,
    };
  if(metadata.kind===CREATOR_KIND)return {
    schema_version:'accord-service-delivery-v1',service_id:serviceId,provider_id:service.provider,kind:CREATOR_KIND,description:metadata.description,metadata_hash:service.metadata_hash,
    input_schema:metadata.input_schema,output_schema:creatorOutputSchema,accepted_evidence:['approved_customer_input','authenticated_provider_report'],freshness_seconds:600,execution_window_seconds:600,maximum_provider_attempts:5,maximum_agent_preparations_per_job:1,maximum_inference_requests_per_job:null,
    retry_policy:'Same immutable job/artifact only; no automatic agent retry',failure_policy:'Reject before payment; recover the identical paid output after payment',
    acceptance_conditions:['Approved input and provider identity match','Agreed output structure and freshness valid','Report hash matches finalized payment receipt'],
    correctness:'External report meaning and quality are unverified; source references are not independently retrieved'
  };
  return {
    schema_version: "accord-service-delivery-v1",
    service_id: serviceId,
    provider_id: service.provider,
    kind: metadata.kind,
    ...(risk?{inference_identity:{provider:"local-mlx",model:LOCAL_MODEL,model_revision:LOCAL_MODEL_REVISION}}:{}),
    description: metadata.description ?? service.name,
    metadata_hash: service.metadata_hash,
    input_schema: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(example).map(([key, v]) => [
          key,
          { type: Array.isArray(v) ? "array" : typeof v },
        ]),
      ),
      additionalProperties: false,
    },
    output_schema: risk?{type:"object",required:["kind","schemaVersion","jobId","target","summary","riskLevel","findings","baselineComparison","limitations","confidence","generatedAt","input_hash","investigation","analysis"],properties:{schemaVersion:{const:"1.0"},confidence:{type:"null"},analysis:{type:"object",description:"Pinned local model explanation, not factual certification"}}}:{
      type: "object",
      properties: {
        summary:{type:'string',maxLength:2000},findings:{type:'array',maxItems:20,items:{type:'string',maxLength:2000}},recommendations:{type:'array',maxItems:20,items:{type:'string',maxLength:2000}},
        ...(chain?{kind:{const:metadata.kind},method:{const:'near-rpc-rules-v1'},status:{enum:['ok','attention','changed','failed']},title:{type:'string',maxLength:80},metrics:{type:'array',items:{type:'object',required:['label','value'],properties:{label:{type:'string'},value:{type:'string'}}}},source:{type:'object',required:['network','block_height','block_hash']},observed_at:{type:'string',format:'date-time'}}:{risk_score:{type:'integer',minimum:0,maximum:100},risk_level:{enum:['low','medium','high']},method:{enum:['deterministic-concentration-v1','near-ai-cloud-v1']}})
      },
      required: chain
        ? [
            "kind",
            "title",
            "method",
            "status",
            "summary",
            "metrics",
            "findings",
            "recommendations",
            "source",
            "observed_at",
          ]
        : [
            "risk_score",
            "risk_level",
            "summary",
            "findings",
            "recommendations",
            "method",
          ],
    },
    accepted_evidence: (chain||risk)
      ? [
          "finalized_block",
          "account_state",
          "access_key_state",
          "finalized_transaction",
        ]
      : ["customer_supplied_snapshot"],
    freshness_seconds: (chain||risk) ? 120 : 600,
    execution_window_seconds: 600,
    maximum_provider_attempts:5,
    maximum_inference_requests_per_job:1,
    retry_policy:
      "Same immutable job/artifact only; no automatic inference retry",
    failure_policy:
      "Reject before payment; preserve and retry exact artifact retrieval after payment",
    acceptance_conditions: [
      "Identity and agreed input match",
      "Required structure valid",
      "Required supported evidence retrieved",
      "Report hash matches finalized payment receipt",
    ],
    correctness: "Conclusions and service quality remain unverified",
  };
}
export type DeliveryContext = {
  id: string;
  cycle: number;
  owner: string;
  input: unknown;
  sub: Subscription;
  service: Service;
  metadata: any;
  spec: ReturnType<typeof deliverySpecification>;
};
export function validatePrepared(
  envelope: any,
  c: DeliveryContext,
  at = Date.now(),
) {
  if (
    c.sub.owner !== c.owner ||
    digest(c.input) !== c.sub.input_hash ||
    c.spec.schema_version !== "accord-service-delivery-v1" ||
    c.spec.service_id !== c.sub.service_id ||
    c.spec.provider_id !== c.service.provider ||
    c.spec.metadata_hash !== c.service.metadata_hash ||
    c.spec.kind !== c.metadata.kind
  )
    throw Error("Delivery specification/owner mismatch");
  if (
    !envelope ||
    envelope.spec_hash !== digest(c.spec) ||
    envelope.job_id !== `${c.id}:${c.cycle}` ||
    envelope.subscription_id !== c.id ||
    envelope.cycle !== c.cycle ||
    envelope.owner !== c.owner ||
    envelope.provider !== c.service.provider ||
    envelope.service_id !== c.sub.service_id ||
    envelope.input_hash !== c.sub.input_hash ||
    envelope.amount !== c.service.price ||
    envelope.schema_version !== "accord-prepared-v1" ||
    typeof envelope.prepare_id !== "string" ||
    !envelope.prepare_id ||
    digest(envelope.report) !== envelope.artifact_hash
  )
    throw Error("Prepared delivery identity or artifact mismatch");
  const time = Date.parse(envelope.prepared_at);
  if (
    !Number.isFinite(time) ||
    time > at + 5000 ||
    at - time > c.spec.execution_window_seconds * 1000
  )
    throw Error("Preparation deadline exceeded");
  validateServiceInput(c.metadata.kind, c.input,c.metadata);
  if(c.metadata.kind===CREATOR_KIND)creatorReport(envelope.report,c.id+':'+c.cycle,c.input,at);
  else if(c.metadata.kind===RISK_KIND)verifyRiskReport(envelope.report,`${c.id}:${c.cycle}`,riskInput(c.input),at,'inference_identity' in c.spec?c.spec.inference_identity:undefined);
  else if (isAgentKind(c.metadata.kind))
    verifyChainReport(envelope.report, c.metadata.kind);
  else verifyReport(envelope.report);
  if (c.metadata.analysis_mode === "groq")
    verifyGroqExplanation(envelope.report.explanation);
  const r = envelope.report;
  if (
    r.metrics &&
    new Set(r.metrics.map((m: any) => m.label)).size !== r.metrics.length
  )
    throw Error("Duplicate report metric labels");
  if (c.metadata.kind!==RISK_KIND&&(
    r.summary.length > 2000 ||
    r.findings.length > 20 ||
    r.recommendations.length > 20 ||
    [...r.findings, ...r.recommendations].some(
      (x: unknown) => typeof x !== "string" || x.length > 2000,
    )
  ))
    throw Error("Report structure exceeds declared bounds");
  return {
    status: "STRUCTURE_VALID" as VerificationStatus,
    checked_at: new Date().toISOString(),
    reference_at:new Date(at).toISOString(),
    schema_valid: true,
    evidence_valid: false,
    factual_correctness: "UNVERIFIED",
    valid_until: new Date(
      time + c.spec.execution_window_seconds * 1000,
    ).toISOString(),
    warnings: [] as string[],
  };
}
export async function validateDeliveryEvidence(
  envelope: any,
  c: DeliveryContext,
  client: Pick<
    typeof rpc,
    "viewBlock" | "viewAccount" | "sendJsonRpc" | "viewTransactionStatus"
  > = rpc,
  at = Date.now(),
) {
  const verification = validatePrepared(envelope, c, at),
    r = envelope.report,
    input = c.input as any,
    refs: any[] = [];
  if(c.metadata.kind===CREATOR_KIND){
    refs.push({type:'approved_customer_input',reference:c.sub.input_hash});
    verification.warnings.push('Creator-supplied report: only approved-input binding, provider authentication and declared structure are checked. Factual accuracy and external references are unverified.');
  }else if(c.metadata.kind===RISK_KIND){
    for(const [which,snapshot] of [['current',r.investigation.current],['baseline',r.investigation.baseline]] as const){
      if(!snapshot)continue;
      const block=await client.viewBlock({blockId:snapshot.block_hash});if(block.header.hash!==snapshot.block_hash||block.header.height!==snapshot.block_height)throw Error('Risk evidence block mismatch');
      const time=Number(BigInt(block.header.timestamp_nanosec)/1000000n);if(which==='current'){if(at-time>c.spec.freshness_seconds*1000||time>at+5000)throw Error('Risk evidence stale');verification.valid_until=new Date(Math.min(Date.parse(verification.valid_until),time+c.spec.freshness_seconds*1000)).toISOString();}
      const state=await client.viewAccount({accountId:input.account_id,blockQuery:{blockId:snapshot.block_hash}});if(codeIdentity(state).hash!==snapshot.accounts[0].code_hash)throw Error('Risk contract evidence mismatch');
      const keys:any=await client.sendJsonRpc('query',{request_type:'view_access_key_list',account_id:input.account_id,block_id:snapshot.block_hash});if(!Array.isArray(keys.keys))throw Error('Risk permission evidence missing');
      const clean=JSON.parse(JSON.stringify(keys.keys,(_k,v)=>typeof v==='bigint'?v.toString():v)).map((k:any)=>({public_key:k.public_key,permission:k.access_key.permission})).sort((a:any,b:any)=>a.public_key.localeCompare(b.public_key));
      if(digest(clean)!==digest(snapshot.accounts[0].keys))throw Error('Risk permission evidence mismatch');refs.push({type:'risk_snapshot',reference:snapshot.block_hash,account:input.account_id,baseline:which==='baseline',height:snapshot.block_height});
    }
  }else if (isAgentKind(c.metadata.kind)) {
    const source = r.source;
    if (source.network !== config.network)
      throw Error("Evidence network mismatch");
    const block = await client.viewBlock({ blockId: source.block_hash });
    if (
      block.header.hash !== source.block_hash ||
      block.header.height !== source.block_height
    )
      throw Error("Evidence block mismatch");
    const observed = Date.parse(r.observed_at),
      blockTime = Number(BigInt(block.header.timestamp_nanosec) / 1000000n);
    if (
      !Number.isFinite(observed) ||
      observed > at + 5000 ||
      at - observed > c.spec.freshness_seconds * 1000 ||
      blockTime > observed + 5000 ||
      at - blockTime > c.spec.freshness_seconds * 1000
    )
      throw Error("Stale or inconsistent report evidence");
    verification.valid_until = new Date(
      Math.min(
        Date.parse(verification.valid_until),
        blockTime + c.spec.freshness_seconds * 1000,
        observed + c.spec.freshness_seconds * 1000,
      ),
    ).toISOString();
    refs.push({
      type: "block",
      reference: source.block_hash,
      height: source.block_height,
      timestamp_ms: blockTime,
    });
    const metric = (name: string) =>
      r.metrics.find((m: any) => m.label === name)?.value;
    if (input.account_id) {
      const target = metric(
        c.metadata.kind === "near-contract-sentinel-v1"
          ? "Contract"
          : "Account",
      );
      if (target !== input.account_id)
        throw Error("Evidence target account mismatch");
      const state = await client.viewAccount({
        accountId: input.account_id,
        blockQuery: { blockId: source.block_hash },
      });
      refs.push({
        type: "account",
        reference: input.account_id,
        block_hash: source.block_hash,
      });
      if (
        c.metadata.kind === "near-wallet-watch-v1" &&
        metric("Total balance · yoctoNEAR") !== String(state.amount)
      )
        throw Error("Account balance evidence mismatch");
      if (
        c.metadata.kind === "near-contract-sentinel-v1" &&
        metric("Observed code hash") &&
        metric("Observed code hash") !==
          (state.global_contract_hash ?? state.code_hash)
      )
        throw Error("Contract code evidence mismatch");
      if (c.metadata.kind === "near-access-guard-v1") {
        const keys: any = await client.sendJsonRpc("query", {
          request_type: "view_access_key_list",
          account_id: input.account_id,
          block_id: source.block_hash,
        });
        if (
          !Array.isArray(keys.keys) ||
          keys.keys.length > 100 ||
          metric("Public keys") !== String(keys.keys.length) ||
          metric("Full-access keys") !==
            String(
              keys.keys.filter(
                (k: any) => k.access_key.permission === "FullAccess",
              ).length,
            )
        )
          throw Error("Permission evidence mismatch");
      }
    }
    if (input.transaction_hash) {
      const tx = await client.viewTransactionStatus({
        txHash: input.transaction_hash,
        accountId: input.signer_account_id,
        waitUntil: "FINAL",
      });
      if (
        tx.final_execution_status !== "FINAL" ||
        tx.transaction.hash !== input.transaction_hash ||
        tx.transaction.signer_id !== input.signer_account_id ||
        source.transaction_hash !== input.transaction_hash
      )
        throw Error("Transaction evidence mismatch");
      refs.push({
        type: "transaction",
        reference: input.transaction_hash,
        signer: input.signer_account_id,
      });
    }
  } else {
    if (
      c.metadata.kind === "portfolio-concentration-v1" &&
      c.metadata.analysis_mode !== "near-ai-cloud" &&
      digest(r) !== digest(analyze(c.input))
    )
      throw Error("Customer snapshot report mismatch");
    verification.warnings.push(
      "Customer-supplied snapshot; holdings and market values are not independently verified.",
    );
  }
  return {
    ...verification,
    status: "EVIDENCE_VALID" as VerificationStatus,
    evidence_valid: true,
    evidence: refs,
    freshness:
      "Within agreed window at purchase/reference time; retained reports are historical snapshots",
    warnings: [
      ...verification.warnings,
      "Evidence and integrity checks do not establish factual correctness of every conclusion.",
    ],
  };
}
export function matchDeliveryReceipt(
  receipt: Receipt,
  envelope: any,
  c: DeliveryContext,
) {
  if (
    receipt.subscription_id !== c.id ||
    receipt.cycle !== c.cycle ||
    receipt.provider !== c.service.provider ||
    receipt.amount !== c.service.price ||
    receipt.artifact_hash !== envelope.artifact_hash
  )
    throw Error("Delivery payment receipt mismatch");
}
