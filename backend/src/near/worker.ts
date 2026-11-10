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
async function providerCall(path: string, body: unknown): Promise<any> {
  const response = await fetch(config.provider + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Provider ${path}: HTTP ${response.status}`);
  return boundedJson(response);
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
      if (!row.artifact_hash) {
        const prepared = await providerCall("/prepare", {
          ...args,
          input: local.input,
        });
        if (
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
          "UPDATE accord_cycles SET state='PREPARED',artifact_hash=$3,prepare_id=$4 WHERE subscription_id=$1 AND cycle=$2 AND artifact_hash IS NULL",
          [local.id, cycle, prepared.artifact_hash, prepared.prepare_id],
        );
        row = (
          await db.query(
            "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2",
            [local.id, cycle],
          )
        ).rows[0];
      }
      let receipt = await view<Receipt | null>("get_receipt", args);
      if (!receipt) {
        if (!sub.active) {
          await db.query(
            "UPDATE accord_subscriptions SET state='CANCELED' WHERE id=$1",
            [local.id],
          );
          continue;
        }
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
        const permission = access.permission;
        if (
          typeof permission !== "object" ||
          !("FunctionCall" in permission) ||
          permission.FunctionCall.receiver_id !== config.contract ||
          permission.FunctionCall.method_names.length !== 1 ||
          permission.FunctionCall.method_names[0] !== "charge" ||
          permission.FunctionCall.allowance === null
        )
          throw new Error(
            "Delegate must be a finite charge-only function-call key",
          );
        await db.query(
          "UPDATE accord_cycles SET state='SUBMITTING' WHERE subscription_id=$1 AND cycle=$2 AND state<>'DELIVERED'",
          [local.id, cycle],
        );
        try {
          await new Account(
            local.owner,
            rpc,
            privateKey as `ed25519:${string}`,
          ).callFunction({
            contractId: config.contract,
            methodName: "charge",
            args: { ...args, artifact_hash: row.artifact_hash },
            gas: 30000000000000n,
            deposit: 0n,
          });
        } catch {
          // A timeout may still have paid. Reconcile the same contract cycle; never invent a replacement purchase.
        }
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
      await db.query(
        "UPDATE accord_cycles SET state='SETTLED',receipt=$3,error=NULL WHERE subscription_id=$1 AND cycle=$2 AND state<>'DELIVERED'",
        [local.id, cycle, receipt],
      );
      const delivered = await providerCall("/deliver", {
        ...args,
        prepare_id: row.prepare_id,
      });
      if (isAgentKind(metadata.kind))
        verifyChainReport(delivered.report, metadata.kind);
      else verifyReport(delivered.report);
      if (digest(delivered.report) !== receipt.artifact_hash)
        throw new Error("Delivered artifact hash mismatch");
      await db.query(
        "UPDATE accord_cycles SET state='DELIVERED',report=$3,error=NULL WHERE subscription_id=$1 AND cycle=$2 AND state<>'DELIVERED'",
        [local.id, cycle, delivered.report],
      );
      await db.query(
        "UPDATE accord_subscriptions SET last_error=NULL WHERE id=$1",
        [local.id],
      );
    } catch (error) {
      // Store a bounded diagnostic without serializing SDK errors, request bodies, or keys.
      const message =
        error instanceof Error ? error.message.slice(0, 200) : "Worker failure";
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
