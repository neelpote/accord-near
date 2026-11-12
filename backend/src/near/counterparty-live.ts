/** Explicit owner-fixture testnet acceptance: one 0.001 NEAR report plus quoted storage. */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { Account } from "near-api-js";
import { signMessage } from "near-api-js/nep413";
import {
  config,
  rpc,
  networkCheck,
  view,
  type Subscription,
  type Receipt,
  type Service,
} from "./config.js";
import { db } from "./db.js";
import { digest } from "./core.js";
import { tick } from "./worker.js";
if (process.env.ACCORD_SECURITY_LIVE !== "1")
  throw Error("Explicit ACCORD_SECURITY_LIVE=1 required");
await networkCheck();
assert.equal(config.network, "testnet");
const key = JSON.parse(
  await readFile(
    new URL("../../../.near-credentials/buyer.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(key.account_id, "buyer.accord-dev-261110.testnet");
const buyer = new Account(key.account_id, rpc, key.private_key),
  base = "http://127.0.0.1:4400";
let cookie = "",
  subId: string | undefined,
  delegate: string | undefined;
const proof: any = {
  network: config.network,
  contract: config.contract,
  scope:
    "Real NEP-413 owner-fixture session, funded testnet agreement and production payment worker",
  started_at: new Date().toISOString(),
  checks: [],
};
async function request(path: string, body?: unknown) {
  const r = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin: config.origin,
      cookie,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await r.json();
  assert.equal(r.status, 200, JSON.stringify(value));
  return { r, value };
}
try {
  const { value: c } = await request("/auth/challenge", {});
  const signed = await signMessage({
    signerAccount: buyer,
    payload: {
      message: c.message,
      nonce: Buffer.from(c.nonce, "base64"),
      recipient: c.recipient,
    },
  });
  const auth = await request("/auth/verify", {
    challenge_id: c.challenge_id,
    accountId: buyer.accountId,
    publicKey: signed.publicKey.toString(),
    signature: Buffer.from(signed.signature).toString("base64"),
  });
  cookie = auth.r.headers.get("set-cookie")!.split(";")[0]!;
  const service = await view<Service>("get_service", { service_id: "2" });
  assert.equal(service.price, "1000000000000000000000");
  assert.equal(service.provider, "provider.accord-dev-261110.testnet");
  const input = {
    account_id: buyer.accountId,
    minimum_available_yocto: "50000000000000000000000",
  };
  const { value: d } = await request("/delegates", {});
  delegate = d.public_key;
  const storage = await view<string>("storage_quote", { max_cycles: 1 });
  assert(BigInt(storage) < 40000000000000000000000n);
  subId = await buyer.callFunction<string>({
    contractId: config.contract,
    methodName: "subscribe",
    args: {
      service_id: "2",
      delegate_key: delegate,
      input_hash: digest(input),
      max_cycles: 1,
      expires_at_ns: ((BigInt(Date.now()) + 1800000n) * 1000000n).toString(),
    },
    deposit: BigInt(service.price) + BigInt(storage),
    gas: 30000000000000n,
  });
  proof.subscription_id = subId;
  for (let i = 0; i < 25; i++) {
    if (await view("get_subscription", { subscription_id: subId })) break;
    await new Promise((r) => setTimeout(r, 750));
  }
  await buyer.addFunctionCallAccessKey({
    publicKey: delegate!,
    contractId: config.contract,
    methodNames: ["charge"],
    allowance: 50000000000000000000000n,
  });
  for (let i = 0; i < 25; i++) {
    try {
      await rpc.viewAccessKey({
        accountId: buyer.accountId,
        publicKey: delegate!,
        finalityQuery: { finality: "final" },
      });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 750));
    }
  }
  await request("/subscriptions", {
    subscription_id: subId,
    provision_id: d.provision_id,
    input,
  });
  await tick();
  assert.equal(
    (await view<Subscription>("get_subscription", { subscription_id: subId }))
      .cycles,
    0,
  );
  assert.equal(
    await view("get_receipt", { subscription_id: subId, cycle: 0 }),
    null,
  );
  const queue = (await request("/security")).value,
    decision = queue.decisions.find(
      (x: any) =>
        x.body.intent.args.subscription_id === subId && x.state === "pending",
    );
  assert(decision, "Expected mandatory warning before payment");
  proof.warning = {
    id: decision.id,
    reasons: decision.body.reasons,
    intent_hash: decision.body.intent_hash,
    evidence_hash: decision.body.evidence_hash,
  };
  proof.checks.push(
    "Funded agreement stayed unpaid while exact-payment approval was pending",
  );
  await request(`/security/decisions/${decision.id}`, {
    approve: true,
    intent_hash: decision.body.intent_hash,
    evidence_hash: decision.body.evidence_hash,
  });
  for (let i = 0; i < 12; i++) {
    await tick();
    const row = (
      await db.query(
        "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND cycle=0",
        [subId],
      )
    ).rows[0];
    if (row?.state === "DELIVERED") {
      proof.artifact_hash = row.artifact_hash;
      assert.equal(digest(row.report), row.artifact_hash);
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert(
    proof.artifact_hash,
    "Expected delivered report after approved charge",
  );
  const receipt = await view<Receipt>("get_receipt", {
    subscription_id: subId,
    cycle: 0,
  });
  assert.equal(receipt.amount, service.price);
  assert.equal(receipt.provider, service.provider);
  proof.receipt = receipt;
  assert.equal(
    (
      await db.query(
        "SELECT state FROM accord_security_decisions WHERE id=$1",
        [decision.id],
      )
    ).rows[0].state,
    "consumed",
  );
  assert.equal(
    (await view<Subscription>("get_subscription", { subscription_id: subId }))
      .cycles,
    1,
  );
  await tick();
  assert.equal(
    (await view<Subscription>("get_subscription", { subscription_id: subId }))
      .cycles,
    1,
  );
  const access = await rpc.viewAccessKey({
    accountId: buyer.accountId,
    publicKey: delegate!,
    finalityQuery: { finality: "final" },
  });
  assert(
    typeof access.permission === "object" &&
      "FunctionCall" in access.permission,
  );
  proof.delegate_permission = access.permission;
  proof.checks.push(
    "Approval consumed once; charge-only key paid exact provider once; report matches receipt; repeated tick did not double-charge",
  );
  proof.passed = true;
} finally {
  if (subId) {
    try {
      await buyer.callFunction({
        contractId: config.contract,
        methodName: "cancel",
        args: { subscription_id: subId },
        deposit: 1n,
        gas: 30000000000000n,
      });
      await db.query(
        "UPDATE accord_subscriptions SET state='CANCELED' WHERE id=$1",
        [subId],
      );
      proof.canceled = true;
    } catch {
      proof.canceled = false;
    }
  }
  if (delegate) {
    try {
      await buyer.deleteKey(delegate);
      proof.delegate_removed = true;
    } catch {
      proof.delegate_removed = false;
    }
  }
  proof.completed_at = new Date().toISOString();
  await writeFile(
    new URL("../../../docs/counterparty-live-proof.json", import.meta.url),
    JSON.stringify(proof, null, 2) + "\n",
  );
  console.log(JSON.stringify(proof, null, 2));
  await db.end();
}
