/** Register and purchase five real agent services with dedicated testnet developer fixtures only. */
import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { Account } from "near-api-js";
import { signMessage } from "near-api-js/nep413";
import {
  config,
  rpc,
  view,
  type Subscription,
  type Service,
  type Receipt,
} from "./config.js";
import { db } from "./db.js";
import {
  agentDefinitions,
  validateServiceInput,
  verifyChainReport,
} from "./agents.js";
import { digest } from "./core.js";
import { tick } from "./worker.js";
const groqDemo = process.env["ACCORD_GROQ_DEMO"] === "1";
const root = resolve(import.meta.dirname, "../../..");
if (config.network !== "testnet" || (await rpc.getNetworkId()) !== "testnet")
  throw Error("This demonstration is testnet only");
async function fixture(role: string) {
  const k = JSON.parse(
    await readFile(resolve(root, ".near-credentials", role + ".json"), "utf8"),
  );
  if (
    !k.account_id.startsWith(role + ".") ||
    !k.account_id.endsWith(".testnet")
  )
    throw Error("Dedicated fixture required");
  return new Account(k.account_id, rpc, k.private_key);
}
const buyer = await fixture("buyer"),
  provider = await fixture("provider");
const evidence: any = {
  network: "testnet",
  contract: config.contract,
  source_commit_at_start: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
  })
    .toString()
    .trim(),
  source_dirty:
    execFileSync("git", ["status", "--porcelain"], { cwd: root })
      .toString()
      .trim().length > 0,
  started_at: new Date().toISOString(),
  agents: [],
  transactions: [],
  checks: [],
};
async function request(
  path: string,
  body: unknown | undefined,
  cookie: string,
) {
  const response = await fetch("http://127.0.0.1:4000" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin: config.origin,
      "content-type": "application/json",
      cookie,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw Error(`${path}: ${result.error}`);
  return result;
}
async function login(account: Account) {
  const c = await request("/auth/challenge", {}, "");
  const signed = await signMessage({
    signerAccount: account,
    payload: {
      message: c.message,
      recipient: c.recipient,
      nonce: Buffer.from(c.nonce, "base64"),
    },
  });
  const response = await fetch("http://127.0.0.1:4000/auth/verify", {
    method: "POST",
    headers: { origin: config.origin, "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: c.challenge_id,
      accountId: account.accountId,
      publicKey: signed.publicKey.toString(),
      signature: Buffer.from(signed.signature).toString("base64"),
    }),
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!.split(";")[0]!;
}
const buyerCookie = await login(buyer),
  providerCookie = await login(provider);
async function finalized(
  account: Account,
  method: string,
  args: Record<string, unknown>,
  deposit = 1n,
) {
  const tx = await account.callFunctionRaw({
    contractId: config.contract,
    methodName: method,
    args,
    gas: 50000000000000n,
    deposit,
  });
  const result = await request(
    "/transactions/confirm",
    { hash: tx.transaction.hash },
    account === buyer ? buyerCookie : providerCookie,
  );
  evidence.transactions.push({ method, hash: tx.transaction.hash });
  return JSON.parse(Buffer.from(result.result, "base64").toString() || "null");
}
// Clean up only previous runs of this named, synthetic demonstration (never arbitrary customers).
for (const row of (
  await db.query(
    "SELECT s.id FROM accord_subscriptions s JOIN accord_cycles c ON c.subscription_id=s.id WHERE s.owner=$1 AND s.input ? 'account_id' GROUP BY s.id",
    [buyer.accountId],
  )
).rows) {
  const sub = await view<Subscription>("get_subscription", {
    subscription_id: row.id,
  });
  if (sub.active) await finalized(buyer, "cancel", { subscription_id: row.id });
}
for (const definition of agentDefinitions().filter(d => !groqDemo || d.kind === "near-network-pulse-v1")) {
  const metadata = {
    ...definition,
    provider_url: config.provider,
    analysis_mode: groqDemo ? "groq" : "deterministic",
    ...(groqDemo ? {name: "Network Pulse Copilot", description: "Live NEAR network evidence with a separate Groq explanation and manual review steps. Public chain data is sent to Groq; no private inference or automatic remediation."} : {}),
  };
  const published = await request("/services", undefined, providerCookie);
  let serviceId = published.find(
    (s: any) => digest(s.metadata) === digest(metadata),
  )?.id;
  if (serviceId) {
    const terms = await view<Service>("get_service", { service_id: serviceId });
    if (
      terms.provider !== provider.accountId ||
      terms.price !== "1000000000000000000000" ||
      terms.interval_ns !== "60000000000"
    )
      serviceId = undefined;
  }
  if (!serviceId) {
    const counters = await view<[string, string]>("counters", {});
    for (
      let n = BigInt(counters[0]) - 1n;
      n >= 0n && n >= BigInt(counters[0]) - 30n;
      n--
    ) {
      const existing = await view<Service>("get_service", {
        service_id: n.toString(),
      });
      if (
        existing.provider === provider.accountId &&
        existing.metadata_hash === digest(metadata) &&
        existing.price === "1000000000000000000000"
      ) {
        serviceId = n.toString();
        break;
      }
    }
    if (!serviceId)
      serviceId = await finalized(
        provider,
        "register_service",
        {
          name: definition.name,
          metadata_hash: digest(metadata),
          price: "1000000000000000000000",
          interval_ns: "60000000000",
        },
        20480000000000000000000n,
      );
    await request(
      "/services",
      { service_id: serviceId, metadata },
      providerCookie,
    );
  }
  const checked = await request(
      "/inputs/validate",
      { service_id: serviceId, input: definition.input_example },
      buyerCookie,
    ),
    input = validateServiceInput(definition.kind, checked.input);
  const d = await request("/delegates", {}, buyerCookie),
    storage = await view<string>("storage_quote", { max_cycles: 3 });
  const subscriptionId = await finalized(
    buyer,
    "subscribe",
    {
      service_id: serviceId,
      delegate_key: d.public_key,
      input_hash: digest(input),
      max_cycles: 3,
      expires_at_ns: ((BigInt(Date.now()) + 3600000n) * 1000000n).toString(),
    },
    BigInt(storage) + 3000000000000000000000n,
  );
  const keyTx = await buyer.addFunctionCallAccessKey({
    publicKey: d.public_key,
    contractId: config.contract,
    methodNames: ["charge"],
    allowance: 50000000000000000000000n,
  });
  await request(
    "/transactions/confirm",
    { hash: keyTx.transaction.hash },
    buyerCookie,
  );
  await request(
    "/subscriptions",
    { subscription_id: subscriptionId, provision_id: d.provision_id, input },
    buyerCookie,
  );
  evidence.agents.push({
    kind: definition.kind,
    name: definition.name,
    service_id: serviceId,
    subscription_id: subscriptionId,
    input,
    delegate_public_key: d.public_key,
  });
  console.log(
    "LISTED AND ACTIVATED",
    definition.name,
    "service",
    serviceId,
    "agreement",
    subscriptionId,
  );
}
const deadline = Date.now() + 240000;
while (Date.now() < deadline) {
  await tick();
  let done = true;
  for (const agent of evidence.agents) {
    const cycles = (
      await db.query(
        "SELECT cycle,state FROM accord_cycles WHERE subscription_id=$1 ORDER BY cycle",
        [agent.subscription_id],
      )
    ).rows;
    if (cycles.filter((c) => c.state === "DELIVERED").length < 2) done = false;
  }
  if (done) break;
  await new Promise((r) => setTimeout(r, 2000));
}
for (const agent of evidence.agents) {
  const cycles = (
    await db.query(
      "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND state='DELIVERED' ORDER BY cycle",
      [agent.subscription_id],
    )
  ).rows;
  assert(
    cycles.length >= 2,
    `${agent.name} did not deliver two real due cycles`,
  );
  for (const row of cycles.slice(0, 2)) {
    verifyChainReport(row.report, agent.kind);
    if (groqDemo) { assert.equal(row.report.explanation.provider, "groq"); assert(row.report.explanation.completion_id); }
    assert.equal(digest(row.report), row.artifact_hash);
    const receipt = await view<Receipt>("get_receipt", {
      subscription_id: agent.subscription_id,
      cycle: row.cycle,
    });
    assert.equal(receipt.artifact_hash, row.artifact_hash);
    assert.equal(receipt.amount, "1000000000000000000000");
    assert.equal(receipt.provider, provider.accountId);
  }
  assert(
    BigInt(cycles[1].receipt.paid_at_ns) -
      BigInt(cycles[0].receipt.paid_at_ns) >=
      60000000000n,
  );
  const row = cycles[0];
  await db.query(
    "INSERT INTO accord_agent_demos(kind,service_id,subscription_id,cycle,input,report,artifact_hash,receipt) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(kind) DO UPDATE SET service_id=excluded.service_id,subscription_id=excluded.subscription_id,cycle=excluded.cycle,input=excluded.input,report=excluded.report,artifact_hash=excluded.artifact_hash,receipt=excluded.receipt,updated_at=now()",
    [
      groqDemo ? `${agent.kind}:${agent.service_id}` : agent.kind,
      agent.service_id,
      agent.subscription_id,
      0,
      agent.input,
      row.report,
      row.artifact_hash,
      row.receipt,
    ],
  );
  agent.cycles = cycles.slice(0, 2).map((c) => ({
    cycle: c.cycle,
    report: c.report,
    artifact_hash: c.artifact_hash,
    receipt: c.receipt,
  }));
  await finalized(buyer, "cancel", { subscription_id: agent.subscription_id });
  const keyTx = await buyer.deleteKey(agent.delegate_public_key);
  await request(
    "/transactions/confirm",
    { hash: keyTx.transaction.hash },
    buyerCookie,
  );
  evidence.checks.push(
    `${agent.name}: two due cycles, exact paid artifacts, final receipts, cancellation and key removal`,
  );
  console.log("VERIFIED", agent.name, row.report.status, row.report.summary);
}
for (const [actor, earnings, cookie] of [
  [buyer, false, buyerCookie],
  [provider, true, providerCookie],
] as const) {
  const b = await request("/balances", undefined, cookie),
    amount = earnings ? b.earned : b.available;
  if (BigInt(amount) > 0n) {
    const before = (await actor.getState()).balance.total;
    await finalized(actor, "withdraw", { amount, earnings });
    assert((await actor.getState()).balance.total > before);
  }
}
evidence.checks.push(
  "Customer remainder and provider earnings reached the actual testnet wallets",
);
evidence.completed_at = new Date().toISOString();
await writeFile(
  resolve(root, groqDemo ? "docs/groq-paid-proof.json" : "docs/agents-demo-proof.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
await mkdir(resolve(root, ".tools"), { recursive: true });
await writeFile(
  resolve(root, ".tools/agents-demo-browser.json"),
  JSON.stringify({ cookie: buyerCookie, account_id: buyer.accountId }),
  { mode: 0o600 },
);
console.log(groqDemo ? "GROQ PAID DEMONSTRATION PASSED" : "FIVE AGENTS DEMONSTRATION PASSED");
await db.end();
