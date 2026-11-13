import test from "node:test";
import assert from "node:assert/strict";
import {
  deliverySpecification,
  validatePrepared,
  validateDeliveryEvidence,
  matchDeliveryReceipt,
} from "./service-delivery.js";
import { runChainAgent } from "./agents.js";
import { digest } from "./core.js";
const hash = "DfcbJBckRVsGXr1v6QARgrZthYDJ1EviULqYWaokLUTX";
async function fixture(): Promise<any> {
  const block = {
      header: {
        height: 123,
        hash,
        timestamp_nanosec: (BigInt(Date.now()) * 1000000n).toString(),
      },
    },
    client: any = {
      viewBlock: async () => block,
      viewAccount: async () => ({
        amount: 1000000000000000000000000n,
        locked: 0n,
        storage_usage: 100,
      }),
      experimental_protocolConfig: async () => ({
        runtime_config: { storage_amount_per_byte: "10000000000000000000" },
      }),
    };
  const input = { account_id: "target.testnet", minimum_available_yocto: "0" },
    metadata = {
      kind: "near-wallet-watch-v1",
      analysis_mode: "deterministic",
      description: "Reserve check",
    },
    service = {
      provider: "provider.testnet",
      name: "Wallet Watch",
      metadata_hash: digest(metadata),
      price: "100",
      interval_ns: "60000000000",
    },
    sub = {
      owner: "buyer.testnet",
      service_id: "2",
      delegate_key: "key",
      input_hash: digest(input),
      active: true,
      cycles: 0,
      max_cycles: 2,
      reserved: "200",
      next_due_ns: "0",
      expires_at_ns: "9999999999999999999",
    },
    spec = deliverySpecification("2", service, metadata),
    c = {
      id: "1",
      cycle: 0,
      owner: sub.owner,
      input,
      sub,
      service,
      metadata,
      spec,
    };
  const report = await runChainAgent("near-wallet-watch-v1", input, client),
    envelope = {
      schema_version: "accord-prepared-v1",
      job_id: "1:0",
      subscription_id: "1",
      cycle: 0,
      owner: sub.owner,
      provider: service.provider,
      service_id: "2",
      input_hash: sub.input_hash,
      amount: "100",
      prepare_id: "opaque-capability",
      prepared_at: new Date().toISOString(),
      spec_hash: digest(spec),
      artifact_hash: digest(report),
      report,
    };
  return { c, envelope, client };
}
test("valid structured report retrieves exact source and remains factually unverified", async () => {
  const { c, envelope, client } = await fixture();
  assert.equal(validatePrepared(envelope, c).status, "STRUCTURE_VALID");
  const v = await validateDeliveryEvidence(envelope, c, client);
  assert.equal(v.status, "EVIDENCE_VALID");
  assert.equal(v.factual_correctness, "UNVERIFIED");
  assert(v.evidence.some((e) => e.reference === "target.testnet"));
  assert(Date.parse(v.valid_until) > Date.now());
});
for (const [name, mutate] of Object.entries({
  "missing required field": (e: any): void => {
    delete e.report.summary;
  },
  "incorrect field type": (e: any): void => {
    e.report.metrics = "invalid";
  },
  "wrong job": (e: any): void => {
    e.job_id = "other:0";
  },
  "wrong customer": (e: any): void => {
    e.owner = "attacker.testnet";
  },
  "wrong agreement": (e: any): void => {
    e.subscription_id = "2";
  },
  "wrong provider": (e: any): void => {
    e.provider = "attacker.testnet";
  },
  "wrong service": (e: any): void => {
    e.service_id = "7";
  },
  "wrong consent": (e: any): void => {
    e.spec_hash = "a".repeat(64);
  },
  "old preparation": (e: any): void => {
    e.prepared_at = "2020-01-01T00:00:00Z";
  },
  "missing schema version": (e: any): void => {
    delete e.schema_version;
  },
  "duplicate output fields": (e: any): void => {
    e.report.metrics.push(e.report.metrics[0]);
  },
  "wrong target": (e: any): void => {
    e.report.metrics.find((m: any) => m.label === "Account").value =
      "wrong.testnet";
  },
  "fabricated balance": (e: any): void => {
    e.report.metrics.find(
      (m: any) => m.label === "Total balance · yoctoNEAR",
    ).value = "1";
  },
  "stale observation": (e: any): void => {
    e.report.observed_at = "2020-01-01T00:00:00Z";
  },
  "unknown block": (e: any) => (e.report.source.block_hash = "1".repeat(32)),
}))
  test("rejects " + name, async () => {
    const { c, envelope, client } = await fixture();
    mutate(envelope);
    envelope.artifact_hash = digest(envelope.report);
    await assert.rejects(() => validateDeliveryEvidence(envelope, c, client));
  });
test("altered report hash and receipt cycle/amount/provider cannot pass delivery verification", async () => {
  const { c, envelope } = await fixture();
  assert.throws(() =>
    validatePrepared({ ...envelope, artifact_hash: "0".repeat(64) }, c),
  );
  const receipt = {
    subscription_id: "1",
    cycle: 0,
    provider: "provider.testnet",
    amount: "100",
    artifact_hash: envelope.artifact_hash,
    paid_at_ns: "1",
  };
  matchDeliveryReceipt(receipt, envelope, c);
  for (const change of [
    { cycle: 1 },
    { amount: "101" },
    { provider: "evil.testnet" },
    { subscription_id: "2" },
    { artifact_hash: "0".repeat(64) },
  ])
    assert.throws(() =>
      matchDeliveryReceipt({ ...receipt, ...change }, envelope, c),
    );
});
test("source RPC outage never becomes evidence-valid", async () => {
  const { c, envelope, client } = await fixture();
  await assert.rejects(() =>
    validateDeliveryEvidence(envelope, c, {
      ...client,
      viewBlock: async () => {
        throw Error("RPC unavailable");
      },
    }),
  );
});

test('risk report uses independent finalized code and key evidence before payment',async()=>{
 const {riskCases}=await import('./risk-cases.js'),{investigate,riskReport,LOCAL_MODEL,LOCAL_MODEL_REVISION}=await import('./risk-analyst.js');
 const sample=riskCases()[2],facts=investigate(sample.input,sample.current,sample.previous),report=riskReport('1:0',sample.input,facts,{summary:'Code changed; implications need review.',explanations:facts.findings.map(f=>({change_id:f.id,why_it_matters:'Different code may change contract behavior.',manual_check:'Compare the approved release.'})),provider:'local-mlx',model:LOCAL_MODEL,model_revision:LOCAL_MODEL_REVISION,completion_id:'controlled',elapsed_ms:1,usage:null,tee_attestation:false});
 const f=await fixture();f.c.metadata={kind:report.kind,analysis_mode:'local-llm'};f.c.input=sample.input;f.c.sub.input_hash=digest(sample.input);f.c.service.metadata_hash=digest(f.c.metadata);f.c.spec=deliverySpecification('2',f.c.service,f.c.metadata);
 Object.assign(f.envelope,{input_hash:f.c.sub.input_hash,report,artifact_hash:digest(report),spec_hash:digest(f.c.spec)});
 const client:any={viewBlock:async({blockId}:any)=>{const s=blockId===sample.current.block_hash?sample.current:sample.previous;return {header:{hash:s.block_hash,height:s.block_height,timestamp_nanosec:String(BigInt(Date.now())*1000000n)}};},viewAccount:async({blockQuery}:any)=>({code_hash:(blockQuery.blockId===sample.current.block_hash?sample.current:sample.previous).accounts[0].code_hash}),sendJsonRpc:async(_method:any,p:any)=>({keys:(p.block_id===sample.current.block_hash?sample.current:sample.previous).accounts[0].keys.map((k:any)=>({public_key:k.public_key,access_key:{permission:k.permission}}))})};
 const result=await validateDeliveryEvidence(f.envelope,f.c,client);assert.equal(result.status,'EVIDENCE_VALID');assert.equal(result.factual_correctness,'UNVERIFIED');assert.equal(result.evidence.length,2);
 client.viewAccount=async()=>({code_hash:'11111111111111111111111111111111'});await assert.rejects(()=>validateDeliveryEvidence(f.envelope,f.c,client),/contract evidence mismatch/);
});
