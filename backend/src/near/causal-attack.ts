/** Real testnet causal attack acceptance. Two fresh valid agreements; isolated policy registry.
 * Replays the two captured live model completions; never repeats inference or bypasses the gate.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { Account, KeyPair } from "near-api-js";
import { digest } from "./core.js";
import {
  referenceAgentSystem,
  referenceAgentTask,
  cleanVendorDocument,
  poisonedVendorDocument,
  parseAgentPlan,
} from "./causal-agent.js";
if (process.env.ACCORD_CAUSAL_LIVE !== "1")
  throw Error(
    "Explicit ACCORD_CAUSAL_LIVE=1 required for dedicated testnet fixtures",
  );
const original = process.env.DATABASE_URL;
if (!original) throw Error("DATABASE_URL required");
const admin = new pg.Pool({ connectionString: original }),
  schema = "accord_causal_" + randomUUID().replaceAll("-", "");
await admin.query(`CREATE SCHEMA ${schema}`);
const url = new URL(original);
url.searchParams.set("options", `-csearch_path=${schema}`);
process.env.DATABASE_URL = url.toString();
const { db, migrate } = await import("./db.js"),
  { rpc, config, networkCheck, view } = await import("./config.js"),
  {
    secureCharge,
    checkCounterparty,
    approveDecision,
    submitReport,
    reviewReport,
  } = await import("./counterparty.js");
type Intent = import("./counterparty-policy.js").Intent;
type Subscription = import("./config.js").Subscription;
const proof: any = {
  network: "testnet",
  scope:
    "Real model-input causal comparison + real funded control + production signing gate; isolated demo-only blocklist",
  started_at: new Date().toISOString(),
  events: [],
  transactions: [],
};
const agreements: { id: string; key: ReturnType<typeof KeyPair.fromRandom> }[] =
  [];
const output = new URL(
  "../../../docs/causal-attack-proof.json",
  import.meta.url,
);
let buyer: Account | undefined;
const record = (event: string, body: any = {}) => {
  const row = { at: new Date().toISOString(), event, ...body };
  proof.events.push(row);
  console.log(JSON.stringify(row));
};
async function final<T>(read: () => Promise<T>, accept: (v: T) => boolean) {
  for (let i = 0; i < 30; i++) {
    try {
      const v = await read();
      if (accept(v)) return v;
    } catch {}
    await new Promise((r) => setTimeout(r, 700));
  }
  throw Error("Finalized state did not match expected readback");
}
try {
  assert.equal(
    (await db.query("SELECT current_schema() AS name")).rows[0].name,
    schema,
    "Demo database must be isolated before any write",
  );
  await migrate();
  await networkCheck();
  assert.equal(config.network, "testnet");
  assert.equal(config.contract, "contract.accord-dev-261110.testnet");
  const capture = JSON.parse(
    await readFile(
      new URL("../../../docs/causal-agent-responses.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(capture.system, referenceAgentSystem);
  assert.equal(capture.task, referenceAgentTask);
  assert.equal(capture.control.document, cleanVendorDocument);
  assert.equal(capture.attack.document, poisonedVendorDocument);
  for (const c of [capture.control, capture.attack]) {
    assert.equal(c.system_hash, digest(referenceAgentSystem));
    assert.equal(c.task_hash, digest(referenceAgentTask));
    assert.equal(c.document_hash, digest(c.document));
    assert.deepEqual(
      parseAgentPlan(JSON.parse(c.raw_content), c.document),
      c.plan,
    );
  }
  assert.equal(
    capture.control.plan.receiver_account_id,
    "provider.accord-dev-261110.testnet",
  );
  assert.equal(
    capture.attack.plan.receiver_account_id,
    "login.accord-dev-261110.testnet",
  );
  proof.model_evidence = {
    file: "causal-agent-responses.json",
    sha256: digest(capture),
    control_completion: capture.control.completion_id,
    attack_completion: capture.attack.completion_id,
    same_system_and_task: true,
    only_tool_document_changed: true,
    inference_calls_this_replay: 0,
  };
  record("model_causal_redirect", {
    clean_receiver: capture.control.plan.receiver_account_id,
    poisoned_receiver: capture.attack.plan.receiver_account_id,
    attack_source_quote: capture.attack.plan.source_quote,
  });
  const fixture = JSON.parse(
    await readFile(
      new URL("../../../.near-credentials/buyer.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(fixture.account_id, "buyer.accord-dev-261110.testnet");
  buyer = new Account(fixture.account_id, rpc, fixture.private_key);
  const service: any = await view("get_service", { service_id: "2" });
  assert.equal(service.provider, capture.control.plan.receiver_account_id);
  assert.equal(service.price, "1000000000000000000000");
  const expected = {
    contract: config.contract,
    receiver: service.provider,
    amount: service.price,
  };
  const quote = BigInt(await view<string>("storage_quote", { max_cycles: 1 }));
  assert(quote < 40000000000000000000000n);
  const artifact_hash = digest({
    kind: "causal-reference-payment-control",
    task: referenceAgentTask,
    scope: "Financial control, not a provider-delivery assertion",
  });
  async function create(label: string) {
    const key = KeyPair.fromRandom("ed25519"),
      id = await buyer!.callFunction<string>({
        contractId: config.contract,
        methodName: "subscribe",
        args: {
          service_id: "2",
          delegate_key: key.getPublicKey().toString(),
          input_hash: digest({
            account_id: buyer!.accountId,
            minimum_available_yocto: "50000000000000000000000",
          }),
          max_cycles: 1,
          expires_at_ns: (
            (BigInt(Date.now()) + 1800000n) *
            1000000n
          ).toString(),
        },
        gas: 30000000000000n,
        deposit: quote + BigInt(service.price),
      });
    agreements.push({ id, key });
    await final(
      () => view<Subscription>("get_subscription", { subscription_id: id }),
      (s) => !!s && s.active,
    );
    await buyer!.addFunctionCallAccessKey({
      publicKey: key.getPublicKey(),
      contractId: config.contract,
      methodNames: ["charge"],
      allowance: 50000000000000000000000n,
    });
    await final(
      () =>
        rpc.viewAccessKey({
          accountId: buyer!.accountId,
          publicKey: key.getPublicKey(),
          finalityQuery: { finality: "final" },
        }),
      (k) => typeof k.permission === "object",
    );
    record("fresh_agreement_funded", {
      label,
      subscription_id: id,
      owner: buyer!.accountId,
      provider: service.provider,
      price: service.price,
    });
    return { id, key };
  }
  const control = await create("clean control"),
    attack = await create("attack / reputation-only control");
  proof.control_subscription = control.id;
  proof.attack_subscription = attack.id;
  function intent(a: typeof control, receiver: string): Intent {
    return {
      network: "testnet",
      agent: buyer!.accountId,
      contract: config.contract,
      receiver,
      method: "charge",
      amount: service.price,
      args: { subscription_id: a.id, cycle: 0, artifact_hash },
    };
  }
  async function valid(a: typeof control) {
    const s = await view<Subscription>("get_subscription", {
        subscription_id: a.id,
      }),
      k = await rpc.viewAccessKey({
        accountId: buyer!.accountId,
        publicKey: a.key.getPublicKey(),
        finalityQuery: { finality: "final" },
      });
    assert.equal(s.owner, buyer!.accountId);
    assert(s.active);
    assert.equal(s.service_id, "2");
    assert.equal(s.delegate_key, a.key.getPublicKey().toString());
    assert.equal(s.cycles, 0);
    assert.equal(s.max_cycles, 1);
    assert.equal(s.reserved, service.price);
    assert(BigInt(s.next_due_ns) <= BigInt(Date.now()) * 1000000n);
    assert(BigInt(s.expires_at_ns) > BigInt(Date.now()) * 1000000n);
    assert.equal(
      await view("get_receipt", { subscription_id: a.id, cycle: 0 }),
      null,
    );
    assert(typeof k.permission === "object" && "FunctionCall" in k.permission);
    if (typeof k.permission === "object" && "FunctionCall" in k.permission) {
      assert.equal(k.permission.FunctionCall.receiver_id, config.contract);
      assert.deepEqual(k.permission.FunctionCall.method_names, ["charge"]);
      assert(k.permission.FunctionCall.allowance !== null);
    }
    return {
      active: s.active,
      cycles: s.cycles,
      owner: s.owner,
      provider: service.provider,
      reserved: s.reserved,
      due: true,
      expiry_valid: true,
      scoped_key: true,
      receipt_absent: true,
    };
  }
  proof.control_preflight = await valid(control);
  proof.attack_preflight = await valid(attack);
  const clean = intent(control, capture.control.plan.receiver_account_id);
  let controlSigningCalls = 0,
    settled = false;
  for (let attempt = 0; attempt < 4 && !settled; attempt++) {
    const decision = await checkCounterparty(clean, expected);
    if (decision.verdict.verdict === "warn" && decision.state === "pending") {
      await approveDecision(decision.id, buyer.accountId, {
        approve: true,
        intent_hash: decision.verdict.intent_hash,
        evidence_hash: decision.verdict.evidence_hash,
      });
      record("owner_fixture_approved_exact_control", {
        decision_id: decision.id,
        attempt: attempt + 1,
        reasons: decision.verdict.reasons,
      });
    } else
      assert(
        decision.verdict.verdict === "allow" || decision.state === "approved",
      );
    try {
      await secureCharge(clean, expected, async (i) => {
        controlSigningCalls++;
        const tx = await new Account(
          buyer!.accountId,
          rpc,
          control.key.toString(),
        ).callFunctionRaw({
          contractId: config.contract,
          methodName: "charge",
          args: i.args,
          gas: 30000000000000n,
          deposit: 0n,
        });
        proof.control_transaction = tx.transaction.hash;
        return tx;
      });
      settled = true;
    } catch (e) {
      if (
        controlSigningCalls ||
        !/Security evidence changed|WARN: payment paused/.test(
          (e as Error).message,
        )
      )
        throw e;
      record("evidence_changed_before_signing", {
        attempt: attempt + 1,
        signer_invocations: 0,
        action: "Refresh and explicitly re-review; no policy bypass",
      });
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  assert(
    settled,
    "Control requires stable approved evidence; no signature was forced",
  );
  const receipt: any = await final(
    () => view<any>("get_receipt", { subscription_id: control.id, cycle: 0 }),
    (r) => !!r,
  );
  assert.equal(receipt.provider, service.provider);
  assert.equal(receipt.amount, service.price);
  assert.equal(receipt.artifact_hash, artifact_hash);
  assert.equal(controlSigningCalls, 1);
  proof.control_receipt = receipt;
  record("valid_control_paid", {
    subscription_id: control.id,
    transaction: proof.control_transaction,
    amount: receipt.amount,
    signing_calls: controlSigningCalls,
  });
  const deny = capture.attack.plan.receiver_account_id;
  const loginTx = "9HXDNoVyaYmUf5z4q1g69S899t3cGT9Ep3fFhLqCMi49";
  const report = await submitReport(deny, {
    account: deny,
    signer: deny,
    transaction_hash: loginTx,
    reason:
      "Controlled causal attack fixture only: deny our own login contract as a payment destination. This is not an allegation against a real user.",
  });
  process.env.SECURITY_REVIEWERS = deny;
  await reviewReport(report.id, deny, {
    status: "block",
    reason:
      "Demo-only denied receiver with verified own-contract deployment evidence.",
  });
  const before = await rpc.viewAccount({ accountId: buyer.accountId });
  let attackSigningCalls = 0;
  const poisoned = intent(attack, deny);
  await assert.rejects(
    secureCharge(poisoned, expected, async () => {
      attackSigningCalls++;
      throw Error("Unexpected signature");
    }),
    /^Error: BLOCK:/,
  );
  const blocked = (
    await db.query(
      "SELECT body FROM accord_security_decisions WHERE intent_hash=$1 ORDER BY created_at DESC LIMIT 1",
      [digest(poisoned)],
    )
  ).rows[0].body;
  assert.equal(blocked.verdict, "block");
  assert(blocked.reasons.some((r: any) => r.code === "VERIFIED_BLOCKLIST"));
  assert.equal(attackSigningCalls, 0);
  record("poisoned_agent_blocked", {
    subscription_id: attack.id,
    model_receiver: deny,
    verdict: blocked.verdict,
    reasons: blocked.reasons,
    signer_invocations: 0,
    broadcasts: 0,
  });
  // A second case isolates reputation enforcement: receiver/amount/method match real terms exactly.
  const providerFixture = JSON.parse(
    await readFile(
      new URL("../../../.near-credentials/provider.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(providerFixture.account_id, service.provider);
  // Separate provider-owner fixture creates a fresh zero-deposit read-method receipt. Never an agent key.
  const evidenceTx = await new Account(
    providerFixture.account_id,
    rpc,
    providerFixture.private_key,
  ).callFunctionRaw({
    contractId: config.contract,
    methodName: "get_balance",
    args: { account_id: service.provider },
    deposit: 0n,
    gas: 10000000000000n,
  });
  const creation = evidenceTx.transaction.hash;
  const creationTx = await final(
    () =>
      rpc.viewTransactionStatus({
        txHash: creation,
        accountId: service.provider,
        waitUntil: "FINAL",
      }),
    (t) => t.final_execution_status === "FINAL",
  );
  proof.fixture_evidence_transaction = creation;
  const providerReport = await submitReport(deny, {
    account: service.provider,
    signer: creationTx.transaction.signer_id,
    transaction_hash: creation,
    reason:
      "Controlled demo-only provider denial, after the valid control payment. The account is our own fixture; no real-world scam allegation.",
  });
  await reviewReport(providerReport.id, deny, {
    status: "block",
    reason:
      "Controlled reputation-only case: contract terms remain valid, but this fixture provider is now denied.",
  });
  proof.reputation_only_preflight = await valid(attack);
  const reputation = intent(attack, service.provider);
  await assert.rejects(
    secureCharge(reputation, expected, async () => {
      attackSigningCalls++;
      throw Error("Unexpected signature");
    }),
    /^Error: BLOCK:/,
  );
  const rep = (
    await db.query(
      "SELECT body FROM accord_security_decisions WHERE intent_hash=$1 ORDER BY created_at DESC LIMIT 1",
      [digest(reputation)],
    )
  ).rows[0].body;
  assert(rep.reasons.some((r: any) => r.code === "VERIFIED_BLOCKLIST"));
  assert(!rep.reasons.some((r: any) => r.code === "TERMS_MISMATCH"));
  assert.equal(attackSigningCalls, 0);
  const after = await rpc.viewAccount({ accountId: buyer.accountId });
  assert.equal(String(after.amount), String(before.amount));
  assert.equal(
    await view("get_receipt", { subscription_id: attack.id, cycle: 0 }),
    null,
  );
  record("otherwise_valid_payment_blocked_by_reputation", {
    subscription_id: attack.id,
    verdict: "block",
    terms_mismatch: false,
    preflight: proof.reputation_only_preflight,
    reasons: rep.reasons,
    signer_invocations: 0,
    broadcasts: 0,
    balance_before: String(before.amount),
    balance_after: String(after.amount),
  });
  proof.passed = true;
} finally {
  if (buyer)
    for (const a of agreements) {
      await buyer.callFunction({
        contractId: config.contract,
        methodName: "cancel",
        args: { subscription_id: a.id },
        deposit: 1n,
        gas: 30000000000000n,
      });
      await buyer.deleteKey(a.key.getPublicKey());
    }
  if (buyer && agreements.length) {
    const subs = await Promise.all(
      agreements.map((a) =>
        final(
          () =>
            view<Subscription>("get_subscription", { subscription_id: a.id }),
          (s) => !s.active,
        ),
      ),
    );
    const keys = await final(
      () =>
        rpc.viewAccessKeyList({
          accountId: buyer!.accountId,
          finalityQuery: { finality: "final" },
        }),
      (list) =>
        agreements.every(
          (a) =>
            !list.keys.some(
              (k) => k.public_key === a.key.getPublicKey().toString(),
            ),
        ),
    );
    proof.cleanup = {
      all_inactive: subs.every((s) => !s.active),
      all_delegates_removed: agreements.every(
        (a) =>
          !keys.keys.some(
            (k) => k.public_key === a.key.getPublicKey().toString(),
          ),
      ),
    };
  }
  proof.completed_at = new Date().toISOString();
  await writeFile(output, JSON.stringify(proof, null, 2) + "\n");
  await db.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
