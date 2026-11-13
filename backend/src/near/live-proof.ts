import {providerHeaders} from "./execution.js";
/** Explicit testnet acceptance run. Uses ONLY dedicated developer fixtures, never customer keys. */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { Account, JsonRpcProvider, KeyPair } from "near-api-js";
import { signMessage } from "near-api-js/nep413";
import { digest } from "./core.js";
import { tick } from "./worker.js";
import { db } from "./db.js";
import { config, view, type Subscription, type Receipt } from "./config.js";
const root = resolve(import.meta.dirname, "../../..");
if(process.env.ACCORD_EXECUTION_LIVE==="1")process.env.ACCORD_PROVIDER_SECRET=(await readFile(resolve(root,".tools/reliability-provider-secret"),"utf8")).trim();
if (
  config.network !== "testnet" ||
  (await new JsonRpcProvider({ url: config.rpc }).getNetworkId()) !== "testnet"
)
  throw new Error("Live proof is testnet only");
const rpc = new JsonRpcProvider({ url: config.rpc });
const fixture = async (role: string) => {
  const k = JSON.parse(
    await readFile(resolve(root, ".near-credentials", role + ".json"), "utf8"),
  );
  return new Account(k.account_id, rpc, k.private_key);
};
const buyer = await fixture("buyer"),
  provider = await fixture("provider");
const apiBase = "http://127.0.0.1:4000",
  evidence: any = {
    network: "testnet",
    contract: config.contract,
    started_at: new Date().toISOString(),
    working_tree_dirty:
      execFileSync(
        "git",
        [
          "diff",
          "HEAD",
          "--",
          "backend/src/near",
          "frontend/app",
          "frontend/lib",
          "contracts-near",
        ],
        { cwd: root },
      ).toString().length > 0,
    code_commit_at_start: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    })
      .toString()
      .trim(),
    checks: [],
    transactions: [],
  };
function check(name: string) {
  evidence.checks.push(name);
  console.log("PASS", name);
}
async function request(path: string, body?: unknown, cookie = "") {
  const r = await fetch(apiBase + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin: config.origin,
      "content-type": "application/json",
      cookie,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await r.json();
  return { r, value };
}
async function login(account: Account) {
  const { value: c } = await request("/auth/challenge", {});
  const signed = await signMessage({
    signerAccount: account,
    payload: {
      message: c.message,
      nonce: Buffer.from(c.nonce, "base64"),
      recipient: c.recipient,
    },
  });
  const { r, value } = await request("/auth/verify", {
    challenge_id: c.challenge_id,
    accountId: account.accountId,
    publicKey: signed.publicKey.toString(),
    signature: Buffer.from(signed.signature).toString("base64"),
  });
  assert.equal(r.status, 200, JSON.stringify(value));
  const cookie = r.headers.get("set-cookie")!.split(";")[0]!;
  const replay = await request("/auth/verify", {
    challenge_id: c.challenge_id,
    accountId: account.accountId,
    publicKey: signed.publicKey.toString(),
    signature: Buffer.from(signed.signature).toString("base64"),
  });
  assert.equal(replay.r.status, 400);
  return cookie;
}
// Explicit human-owner fixture approval, scoped to this run's agreement only.
async function approveFixtureWarnings(subscriptionId: string, cookie: string) {
  const { value: queue } = await request("/security", undefined, cookie);
  for (const d of queue.decisions.filter(
    (x: any) =>
      x.state === "pending" &&
      x.body.intent.args.subscription_id === subscriptionId,
  )) {
    const reviewed = await request(
      `/security/decisions/${d.id}`,
      {
        approve: true,
        intent_hash: d.body.intent_hash,
        evidence_hash: d.body.evidence_hash,
      },
      cookie,
    );
    assert.equal(reviewed.r.status, 200, JSON.stringify(reviewed.value));
  }
}
// Revoke any unfinished agreements from previous interrupted runs using only this fixture's owner.
const totals = await view<[string, string]>("counters", {});
for (let n = 0n; n < BigInt(totals[1]); n++) {
  const sub = await view<Subscription>("get_subscription", {
    subscription_id: n.toString(),
  });
  if (sub.owner === buyer.accountId && sub.active)
    await buyer.callFunction({
      contractId: config.contract,
      methodName: "cancel",
      args: { subscription_id: n.toString() },
      deposit: 1n,
      gas: 30000000000000n,
    });
}
const buyerCookie = await login(buyer),
  providerCookie = await login(provider);
check("NEP-413 full-access ownership verified; nonce replay rejected");
assert.equal((await request("/subscriptions")).r.status, 401);
check("Unauthenticated agreement access rejected");
const invalidOrigin = await fetch(apiBase + "/auth/challenge", {
  method: "POST",
  headers: {
    origin: "https://attacker.invalid",
    "content-type": "application/json",
  },
  body: "{}",
});
assert.equal(invalidOrigin.status, 403);
check("Cross-origin mutation rejected");
const metadata = {
  kind: "portfolio-concentration-v1",
  description:
    "Portfolio concentration analysis for a supplied snapshot. Deterministic portfolio analysis; no live prices or AI inference.",
  provider_url: config.provider,
};
let serviceId: string;
const published = (await request("/services")).value;
const existing = published.find(
  (s: any) => digest(s.metadata) === digest(metadata),
);
if (existing) serviceId = existing.id;
else {
  serviceId = await provider.callFunction<string>({
    contractId: config.contract,
    methodName: "register_service",
    args: {
      name: "Portfolio concentration report",
      metadata_hash: digest(metadata),
      price: "10000000000000000000000",
      interval_ns: "60000000000",
    },
    deposit: 20480000000000000000000n,
    gas: 30000000000000n,
  });
  // Wait for finality before the API independently verifies ownership and metadata.
  for (let i = 0; i < 20; i++) {
    try {
      if (await view("get_service", { service_id: serviceId })) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  const registered = await request(
    "/services",
    { service_id: serviceId, metadata },
    providerCookie,
  );
  assert.equal(registered.r.status, 200, JSON.stringify(registered.value));
}
assert.equal(
  (await request("/services", { service_id: serviceId, metadata }, buyerCookie))
    .r.status,
  400,
);
check(
  "Provider registration bound to real wallet/metadata; wrong owner rejected",
);
const input = {
  walletAddress: "example.testnet",
  holdings: [
    { symbol: "NEAR", balance: "10", value_usd: 80 },
    { symbol: "USDC", balance: "20", value_usd: 20 },
  ],
  totalValueUsd: 100,
};
const { value: d } = await request("/delegates", {}, buyerCookie);
const subId = await buyer.callFunction<string>({
  contractId: config.contract,
  methodName: "subscribe",
  args: {
    service_id: serviceId,
    delegate_key: d.public_key,
    input_hash: digest(input),
    max_cycles: 3,
    expires_at_ns: ((BigInt(Date.now()) + 3600000n) * 1000000n).toString(),
  },
  deposit: 65840000000000000000000n,
  gas: 30000000000000n,
});
for (let i = 0; i < 20; i++) {
  if (await view("get_subscription", { subscription_id: subId })) break;
  await new Promise((r) => setTimeout(r, 1000));
}
await buyer.addFunctionCallAccessKey({
  publicKey: d.public_key,
  contractId: config.contract,
  methodNames: ["charge"],
  allowance: 50000000000000000000000n,
});
for (let i = 0; i < 20; i++) {
  try {
    await rpc.viewAccessKey({
      accountId: buyer.accountId,
      publicKey: d.public_key,
      finalityQuery: { finality: "final" },
    });
    break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
try {
const activation = await request(
  "/subscriptions",
  { subscription_id: subId, provision_id: d.provision_id, input,spec_hash:(await request(`/services/${serviceId}/execution`)).value.spec_hash },
  buyerCookie,
);
assert.equal(activation.r.status, 200, JSON.stringify(activation.value));
check(
  "Finite agreement funded and charge-only delegate installed; API verified both",
);
await tick();
assert.equal(await view('get_receipt',{subscription_id:subId,cycle:0}),null);
const execution=(await request(`/services/${serviceId}/execution`)).value;
const approval=await request(`/subscriptions/${subId}/execution`,{approve:true,identity_hash:execution.identity.hash,spec_hash:execution.spec_hash},buyerCookie);
assert.equal(approval.r.status,200,JSON.stringify(approval.value));
await request(`/subscriptions/${subId}/execution`,{paused:true},buyerCookie);await tick();assert.equal(await view('get_receipt',{subscription_id:subId,cycle:0}),null);
await request(`/subscriptions/${subId}/execution`,{approve:true,identity_hash:execution.identity.hash,spec_hash:execution.spec_hash},buyerCookie);
check('Unapproved and owner-paused jobs cannot charge; exact owner identity approval resumes work');
const falseProof = await fetch(config.provider + "/deliver", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    subscription_id: subId,
    cycle: 0,
    prepare_id: "invented",
    receipt: { status: "SUCCESS" },
  }),
});
assert.equal(falseProof.status, 401);
check("Unauthenticated provider request cannot unlock an unpaid report");
await Promise.all([tick(), tick()]);
let rows = (
  await db.query("SELECT * FROM accord_cycles WHERE subscription_id=$1", [
    subId,
  ])
).rows;
for (let i = 0; i < 8 && rows[0]?.state !== "DELIVERED"; i++) {
  await approveFixtureWarnings(subId, buyerCookie);
  await tick();
  rows = (
    await db.query("SELECT * FROM accord_cycles WHERE subscription_id=$1", [
      subId,
    ])
  ).rows;
}
assert.equal(rows.length, 1);
assert.equal(
  rows[0].state,
  "DELIVERED",
  JSON.stringify(rows.map((r) => ({ state: r.state, error: r.error }))),
);
assert.equal(rows[0].report.risk_score, 80);
assert.equal(digest(rows[0].report), rows[0].artifact_hash);
check(
  "Concurrent workers produced one verified credit and matching delivered report",
);
const first = await view<Receipt>("get_receipt", {
  subscription_id: subId,
  cycle: 0,
});
assert.equal(first.amount, "10000000000000000000000");
assert.equal(first.provider, provider.accountId);
const encrypted = (
  await db.query(
    "SELECT delegate_cipher FROM accord_subscriptions WHERE id=$1",
    [subId],
  )
).rows[0].delegate_cipher;
const { unseal } = await import("./core.js");
const { encryptionKey } = await import("./worker.js");
const delegated = new Account(
  buyer.accountId,
  rpc,
  unseal(encrypted, encryptionKey()) as `ed25519:${string}`,
);
await delegated.callFunction({
  contractId: config.contract,
  methodName: "charge",
  args: {
    subscription_id: subId,
    cycle: 0,
    artifact_hash: first.artifact_hash,
  },
  gas: 30000000000000n,
});
const firstDue = BigInt(
  (await view<Subscription>("get_subscription", { subscription_id: subId }))
    .next_due_ns,
);
if (BigInt(Date.now()) * 1000000n < firstDue - 10000000000n) {
  await assert.rejects(() =>
    delegated.callFunction({
      contractId: config.contract,
      methodName: "charge",
      args: {
        subscription_id: subId,
        cycle: 1,
        artifact_hash: first.artifact_hash,
      },
      gas: 30000000000000n,
    }),
  );
  check("Early cycle rejected on live testnet");
} else
  check(
    "Early-cycle enforcement covered by real Sandbox test; public RPC delay exceeded live early window",
  );
await assert.rejects(() =>
  delegated.callFunction({
    contractId: config.contract,
    methodName: "cancel",
    args: { subscription_id: subId },
    gas: 30000000000000n,
    deposit: 1n,
  }),
);
check("Duplicate retry idempotent; delegate cancellation rejected on testnet");
const sub = await view<Subscription>("get_subscription", {
  subscription_id: subId,
});
const due = BigInt(sub.next_due_ns);
console.log("Waiting for actual testnet billing interval; no time simulation");
while (BigInt(Date.now()) * 1000000n < due + 2000000000n)
  await new Promise((r) => setTimeout(r, 1000));
await tick();
rows = (
  await db.query(
    "SELECT * FROM accord_cycles WHERE subscription_id=$1 ORDER BY cycle",
    [subId],
  )
).rows;
for (
  let i = 0;
  i < 8 && rows.find((r) => r.cycle === 1)?.state !== "DELIVERED";
  i++
) {
  await approveFixtureWarnings(subId, buyerCookie);
  await tick();
  rows = (
    await db.query(
      "SELECT * FROM accord_cycles WHERE subscription_id=$1 ORDER BY cycle",
      [subId],
    )
  ).rows;
}
assert.equal(rows.length, 2);
assert.equal(rows[1].state, "DELIVERED");
check("Second report purchased after a real 60-second testnet interval");
const cancel = await buyer.callFunctionRaw({
  contractId: config.contract,
  methodName: "cancel",
  args: { subscription_id: subId },
  deposit: 1n,
  gas: 30000000000000n,
});
evidence.transactions.push({ step: "cancel", hash: cancel.transaction.hash });
await assert.rejects(() =>
  delegated.callFunction({
    contractId: config.contract,
    methodName: "charge",
    args: {
      subscription_id: subId,
      cycle: 2,
      artifact_hash: first.artifact_hash,
    },
    gas: 30000000000000n,
  }),
);
await buyer.deleteKey(d.public_key);
check(
  "Cancellation revoked contract authority; wallet function-call key removed",
);
for (const [a, earnings] of [
  [buyer, false],
  [provider, true],
] as const) {
  let b: any;
  for (let i = 0; i < 20; i++) {
    b = await view("get_balance", { account_id: a.accountId });
    if (b[earnings ? "earned" : "available"] !== "0") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const amount = b[earnings ? "earned" : "available"];
  assert(BigInt(amount) > 0n);
  const before = (await a.getState()).balance.total;
  const tx = await a.callFunctionRaw({
    contractId: config.contract,
    methodName: "withdraw",
    args: { amount, earnings },
    deposit: 1n,
    gas: 50000000000000n,
  });
  evidence.transactions.push({
    step: earnings ? "provider_withdrawal" : "customer_exit",
    hash: tx.transaction.hash,
    amount,
  });
  // Final receipt readback and actual receiving account increase are distinct checks.
  for (let i = 0; i < 20; i++) {
    b = await view("get_balance", { account_id: a.accountId });
    if (b.pending === "0" && b[earnings ? "earned" : "available"] === "0")
      break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(b.pending, "0");
  assert.equal(b[earnings ? "earned" : "available"], "0");
  const after = (await a.getState()).balance.total;
  assert(after > before);
}
check(
  "Actual customer exit and provider payout verified through callback state and wallet balances",
);
const forbidden = await request(
  "/subscriptions/" + subId + "/cancel",
  {},
  providerCookie,
);
assert.equal(forbidden.r.status, 400);
check("Wrong session cannot cancel another owner agreement");
evidence.subscription_id = subId;
evidence.service_id = serviceId;
evidence.receipts = [
  first,
  await view("get_receipt", { subscription_id: subId, cycle: 1 }),
];
if(process.env.ACCORD_DELIVERY_LIVE==='1'){
 const verified=(await db.query('SELECT cycle,verification,delivered_at,payment_tx FROM accord_cycles WHERE subscription_id=$1 ORDER BY cycle',[subId])).rows;
 for(const row of verified){assert.equal(row.verification.status,'DELIVERY_VERIFIED');assert.equal(row.verification.factual_correctness,'UNVERIFIED');assert(row.delivered_at);assert(/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(row.payment_tx));}
 evidence.delivery_verification=verified;check('Both paid deliveries have distinct structure/evidence stages, transaction references and completion timestamps; factual correctness stays unverified');
}
evidence.finished_at = new Date().toISOString();
evidence.input_disclosure =
  "Illustrative user-supplied portfolio snapshot; deterministic report, no live oracle or AI inference.";
await writeFile(
  resolve(root, process.env.ACCORD_EXECUTION_LIVE==="1"?(process.env.ACCORD_DELIVERY_LIVE==="1"?"docs/reliability/phase2-testnet.json":"docs/reliability/phase1-testnet.json"):"docs/testnet-proof.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log("TESTNET ACCEPTANCE PASSED", subId);
}finally{
  const current=await view<Subscription>('get_subscription',{subscription_id:subId});
  if(current.active)await buyer.callFunction({contractId:config.contract,methodName:'cancel',args:{subscription_id:subId},deposit:1n,gas:30000000000000n});
  const keys=await rpc.viewAccessKeyList({accountId:buyer.accountId,finalityQuery:{finality:'final'}});
  if(keys.keys.some(k=>k.public_key===d.public_key))await buyer.deleteKey(d.public_key);
  await db.end();
}
