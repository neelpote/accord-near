import {RISK_KIND,verifyRiskReport,riskInput,verifyRiskBaseline} from "./risk-analyst.js";
import {validatePrepared,validateDeliveryEvidence,matchDeliveryReceipt} from "./service-delivery.js";
import {recordVerification} from "./delivery-store.js";
import {authorizeExecution,assertLimitedKey} from "./execution-policy.js";
import {agentIdentity,providerHeaders,securityEvent,verifyProviderRequest} from "./execution.js";
import { secureCharge } from "./counterparty.js";
import { verifyGroqExplanation } from "./groq.js";
import { Account, KeyPair } from "near-api-js";
import { db } from "./db.js";
import {
  config,
  rpc,
  view,
  type Subscription,
  type Service,
  type Receipt,
} from "./config.js";
import { isAgentKind, verifyChainReport } from "./agents.js";
import { digest, unseal, verifyReport, boundedJson } from "./core.js";
export function encryptionKey(): Buffer {
  const raw = process.env["DELEGATE_ENCRYPTION_KEY"];
  if (!raw || !/^[0-9a-f]{64}$/.test(raw))
    throw new Error("Set DELEGATE_ENCRYPTION_KEY to 32 random bytes in hex");
  return Buffer.from(raw, "hex");
}
async function providerCall(path: string, body: unknown,id:string,cycle:number): Promise<any> {
  if(!(await db.query('UPDATE accord_cycles SET provider_attempts=provider_attempts+1 WHERE subscription_id=$1 AND cycle=$2 AND provider_attempts<5 RETURNING cycle',[id,cycle])).rowCount)throw Error('Delivery retry limit reached; owner review required');
  const response = await fetch(config.provider + path, {
    method: "POST",
    headers: { "content-type": "application/json",...providerHeaders(path,body) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Provider ${path}: HTTP ${response.status}`);
  const payload=await boundedJson(response);
  verifyProviderRequest(path+'/response',{request_hash:digest(body),response:payload},response.headers.get('x-accord-time'),response.headers.get('x-accord-auth'));
  return payload;
}
export async function tick() {
  const subscriptions = (
    await db.query(
      "SELECT * FROM accord_subscriptions WHERE state='ACTIVE' ORDER BY id",
    )
  ).rows;
  for (const local of subscriptions) {
    const connection = await db.connect();
    let locked = false;
    try {
      // Session advisory lock serializes live workers; contract cycle/hash is the durable monetary fence.
      locked = (
        await connection.query(
          "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
          ["accord:" + local.id],
        )
      ).rows[0].locked;
      if (!locked) continue;
      const sub = await view<Subscription>("get_subscription", {
        subscription_id: local.id,
      });
      const unresolved = (
        await db.query(
          "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND state NOT IN ('DELIVERED') ORDER BY cycle LIMIT 1",
          [local.id],
        )
      ).rows[0];
      if (
        !unresolved &&
        (!sub.active ||
          sub.cycles >= sub.max_cycles ||
          BigInt(sub.expires_at_ns) <= BigInt(Date.now()) * 1000000n)
      ) {
        const state = !sub.active
          ? "CANCELED"
          : sub.cycles >= sub.max_cycles
            ? "COMPLETE"
            : "EXPIRED";
        await db.query("UPDATE accord_subscriptions SET state=$2 WHERE id=$1", [
          local.id,
          state,
        ]);
        continue;
      }
      if (
        !unresolved &&
        BigInt(sub.next_due_ns) > BigInt(Date.now()) * 1000000n
      )
        continue;
      const cycle: number = unresolved?.cycle ?? sub.cycles;
      const args = { subscription_id: local.id, cycle };
      await db.query(
        "INSERT INTO accord_cycles(subscription_id,cycle,state) VALUES($1,$2,'PREPARING') ON CONFLICT DO NOTHING",
        [local.id, cycle],
      );
      let row = (
        await db.query(
          "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2",
          [local.id, cycle],
        )
      ).rows[0];
      if (!row || row.state === "DELIVERED") continue;
      const service = await view<Service>("get_service", {
        service_id: sub.service_id,
      });
      const metadata = (
        await db.query("SELECT metadata FROM accord_services WHERE id=$1", [
          sub.service_id,
        ])
      ).rows[0]?.metadata;
      if (!metadata || digest(metadata) !== service.metadata_hash)
        throw new Error("Service metadata differs from onchain agreement");
      const identity=agentIdentity(sub.service_id,service,metadata);
      const enabled=(await db.query('SELECT execution_enabled FROM accord_services WHERE id=$1',[sub.service_id])).rows[0]?.execution_enabled;
      const priorReceipt=await view<Receipt|null>('get_receipt',args);
      const freshLocal=(await db.query('SELECT * FROM accord_subscriptions WHERE id=$1',[local.id])).rows[0];
      authorizeExecution({id:local.id,owner:local.owner,input:local.input,paused:freshLocal.execution_paused,approved_identity:freshLocal.approved_identity,identity:identity.hash,enabled,sub,service,metadata,cycle,receipt:priorReceipt});
      await securityEvent(local.owner,local.id,'job_authorized',{cycle,identity_hash:identity.hash,recovery:!!priorReceipt});
      if (unresolved)await securityEvent(local.owner,local.id,'job_retry',{cycle,state:row.state});
      if(!priorReceipt&&(!freshLocal.delivery_spec||digest(freshLocal.delivery_spec)!==freshLocal.delivery_spec_hash))throw Error('Delivery specification approval required');
      const deliveryContext={id:local.id,cycle,owner:local.owner,input:local.input,sub,service,metadata,spec:freshLocal.delivery_spec};
      if (!row.artifact_hash) {
        const prepared = await providerCall("/prepare", {
          ...args,
          input: local.input,
          identity_hash:identity.hash,
          spec_hash:freshLocal.delivery_spec_hash,
        },local.id,cycle);
        if (
          prepared.identity_hash !== identity.hash ||
          prepared.subscription_id !== local.id ||
          prepared.cycle !== cycle ||
          prepared.provider !== service.provider ||
          prepared.amount !== service.price ||
          prepared.input_hash !== sub.input_hash ||
          !/^[0-9a-f]{64}$/.test(prepared.artifact_hash) ||
          typeof prepared.prepare_id !== "string"
        )
          throw new Error("Prepared offer disagrees with signed terms");
        await db.query(
          "UPDATE accord_cycles SET state='PREPARED',artifact_hash=$3,prepare_id=$4,prepared=$5 WHERE subscription_id=$1 AND cycle=$2 AND artifact_hash IS NULL",
          [local.id, cycle, prepared.artifact_hash, prepared.prepare_id,prepared],
        );
        row = (
          await db.query(
            "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2",
            [local.id, cycle],
          )
        ).rows[0];
      }
      if(row.prepared&&deliveryContext.spec){
        if(metadata.kind===RISK_KIND){
          const previous=cycle>0?(await db.query('SELECT report FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2',[local.id,cycle-1])).rows[0]?.report:null;
          const paid=cycle>0?await view<Receipt|null>('get_receipt',{subscription_id:local.id,cycle:cycle-1}):null;
          verifyRiskBaseline(row.prepared.report,cycle,previous,paid,local.id,service.provider,service.price,riskInput(local.input));
        }
        const at=priorReceipt?Number(BigInt(priorReceipt.paid_at_ns)/1000000n):Date.now();
        await recordVerification(local.owner,local.id,cycle,validatePrepared(row.prepared,deliveryContext,at));
        row.verification=await validateDeliveryEvidence(row.prepared,deliveryContext,rpc,at);
        await recordVerification(local.owner,local.id,cycle,row.verification);
      }else if(!priorReceipt)throw Error('Prepared report must be validated before payment');
      let receipt = await view<Receipt | null>("get_receipt", args);
      if (!receipt) {
        if (!sub.active) {
          await db.query(
            "UPDATE accord_subscriptions SET state='CANCELED' WHERE id=$1",
            [local.id],
          );
          continue;
        }
        await secureCharge(
          {
            network: config.network as "testnet" | "sandbox",
            agent: local.owner,
            contract: config.contract,
            receiver: service.provider,
            method: "charge",
            amount: service.price,
            args: { ...args, artifact_hash: row.artifact_hash },
          },
          {
            contract: config.contract,
            receiver: service.provider,
            amount: service.price,
          },
          async (intent) => {
            if(!row.verification?.valid_until||Date.now()>Date.parse(row.verification.valid_until))throw Error('Delivery evidence expired before signing');
            const current=await view<Subscription>('get_subscription',{subscription_id:local.id});
            const currentLocal=(await db.query('SELECT * FROM accord_subscriptions WHERE id=$1',[local.id])).rows[0];
            const currentEnabled=(await db.query('SELECT execution_enabled FROM accord_services WHERE id=$1',[sub.service_id])).rows[0]?.execution_enabled;
            authorizeExecution({id:local.id,owner:local.owner,input:local.input,paused:currentLocal.execution_paused,approved_identity:currentLocal.approved_identity,identity:agentIdentity(sub.service_id,service,metadata).hash,enabled:currentEnabled,sub:current,service,metadata,cycle});
            await securityEvent(local.owner,local.id,'payment_request',{cycle,artifact_hash:row.artifact_hash});
            const privateKey = unseal(local.delegate_cipher, encryptionKey());
            if (
              KeyPair.fromString(privateKey as `ed25519:${string}`)
                .getPublicKey()
                .toString() !== sub.delegate_key
            )
              throw new Error("Delegate differs from agreement");
            const access = await rpc.viewAccessKey({
              accountId: local.owner,
              publicKey: sub.delegate_key,
              finalityQuery: { finality: "final" },
            });
            assertLimitedKey(access.permission,config.contract);
            await db.query(
              "UPDATE accord_cycles SET state='SUBMITTING' WHERE subscription_id=$1 AND cycle=$2 AND state<>'DELIVERED'",
              [local.id, cycle],
            );
            try {
              const transaction=await new Account(
                local.owner,
                rpc,
                privateKey as `ed25519:${string}`,
              ).callFunctionRaw({
                contractId: config.contract,
                methodName: "charge",
                args: intent.args,
                gas: 30000000000000n,
                deposit: 0n,
              });
              await db.query("UPDATE accord_cycles SET payment_tx=$3 WHERE subscription_id=$1 AND cycle=$2",[local.id,cycle,transaction.transaction.hash]);
            } catch {
              // A timeout may still have paid. Reconcile the same contract cycle; never invent a replacement purchase.
            }
          },
        );
        receipt = await view<Receipt | null>("get_receipt", args);
        if (!receipt) {
          await db.query(
            "UPDATE accord_cycles SET state='UNCERTAIN',error='No final receipt yet; only the identical cycle/hash may be retried' WHERE subscription_id=$1 AND cycle=$2 AND state<>'DELIVERED'",
            [local.id, cycle],
          );
          continue;
        }
      }
      if (
        receipt.subscription_id !== local.id ||
        receipt.cycle !== cycle ||
        receipt.provider !== service.provider ||
        receipt.amount !== service.price ||
        receipt.artifact_hash !== row.artifact_hash
      )
        throw new Error("Final receipt disagrees with frozen purchase");
      // Final receipts also resolve any approval request opened during a finality delay.
      await db.query(
        `UPDATE accord_security_decisions SET state='consumed',
          body=body || jsonb_build_object('resolution','receipt_confirmed'),acted_at=COALESCE(acted_at,now())
         WHERE owner=$1 AND body->'intent'->'args'->>'subscription_id'=$2
          AND body->'intent'->'args'->>'cycle'=$3 AND body->'intent'->'args'->>'artifact_hash'=$4
          AND state<>'consumed'`,
        [local.owner, local.id, String(cycle), row.artifact_hash],
      );
      await db.query(
        "UPDATE accord_cycles SET state='SETTLED',receipt=$3,error=NULL WHERE subscription_id=$1 AND cycle=$2 AND state<>'DELIVERED'",
        [local.id, cycle, receipt],
      );
      const delivered = await providerCall("/deliver", {
        ...args,
        prepare_id: row.prepare_id,
      },local.id,cycle);
      if(metadata.kind===RISK_KIND)verifyRiskReport(delivered.report,`${local.id}:${cycle}`,riskInput(local.input),Number(BigInt(receipt.paid_at_ns)/1000000n));
      else if (isAgentKind(metadata.kind))
        verifyChainReport(delivered.report, metadata.kind);
      else verifyReport(delivered.report);
      if (metadata.analysis_mode === "groq")
        verifyGroqExplanation(delivered.report.explanation);
      if(row.prepared&&deliveryContext.spec){
        const envelope={...row.prepared,report:delivered.report,artifact_hash:delivered.artifact_hash};
        matchDeliveryReceipt(receipt,envelope,deliveryContext);
        const verified=await validateDeliveryEvidence(envelope,deliveryContext,rpc,Number(BigInt(receipt.paid_at_ns)/1000000n));
        await recordVerification(local.owner,local.id,cycle,{...verified,status:'DELIVERY_VERIFIED',payment_confirmed:true,job_id:`${local.id}:${cycle}`,delivered_at:new Date().toISOString()});
      }else await recordVerification(local.owner,local.id,cycle,{status:'PENDING',schema_valid:true,evidence_valid:false,factual_correctness:'UNVERIFIED',warnings:['Legacy paid artifact: no new delivery specification consent or independent evidence verification is claimed.']});
      if (digest(delivered.report) !== receipt.artifact_hash)
        throw new Error("Delivered artifact hash mismatch");
      await db.query(
        "UPDATE accord_cycles SET state='DELIVERED',report=$3,delivered_at=COALESCE(delivered_at,now()),error=NULL WHERE subscription_id=$1 AND cycle=$2 AND state<>'DELIVERED'",
        [local.id, cycle, delivered.report],
      );
      await db.query(
        "UPDATE accord_subscriptions SET last_error=NULL WHERE id=$1",
        [local.id],
      );
    } catch (error) {
      if(error instanceof Error&&/delivery|Prepared|Report|Evidence|Stale|specification|artifact|snapshot|Provider/i.test(error.message)){
        const failed=(await db.query("SELECT cycle FROM accord_cycles WHERE subscription_id=$1 AND state<>'DELIVERED' ORDER BY cycle LIMIT 1",[local.id])).rows[0];
        if(failed)await recordVerification(local.owner,local.id,failed.cycle,{status:'REJECTED',factual_correctness:'UNVERIFIED',warnings:[error.message.slice(0,200)],checked_at:new Date().toISOString()});
      }
      // Store a bounded diagnostic without serializing SDK errors, request bodies, or keys.
      await securityEvent(local.owner,local.id,'execution_rejected',{category:"policy_or_execution_failure"}).catch(()=>{});
      const failedCycle=(await db.query("SELECT cycle FROM accord_cycles WHERE subscription_id=$1 AND state<>'DELIVERED' ORDER BY cycle LIMIT 1",[local.id])).rows[0];
      const message =
        error instanceof Error ? error.message.slice(0, 200) : "Worker failure";
      if(failedCycle)await db.query("UPDATE accord_cycles SET error=$3 WHERE subscription_id=$1 AND cycle=$2",[local.id,failedCycle.cycle,message]);
      await db.query(
        "UPDATE accord_subscriptions SET last_error=$2 WHERE id=$1",
        [local.id, message],
      );
    } finally {
      if (locked)
        await connection
          .query("SELECT pg_advisory_unlock(hashtext($1))", [
            "accord:" + local.id,
          ])
          .catch(() => {});
      connection.release();
    }
  }
}
