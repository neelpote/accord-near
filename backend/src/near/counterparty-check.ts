/** Isolated PostgreSQL + HTTP + production signing-gate checks. No keys or chain transactions. */
import "dotenv/config";
import "./causal-agent.js"; // Regression: importing the planner must not initialize the original DB.
import "express-async-errors";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import express from "express";
const original = process.env.DATABASE_URL;
if (!original) throw Error("DATABASE_URL required");
const admin = new pg.Pool({ connectionString: original }),
  schema = "accord_security_test_" + randomUUID().replaceAll("-", "");
await admin.query(`CREATE SCHEMA ${schema}`);
const url = new URL(original);
url.searchParams.set("options", `-csearch_path=${schema}`);
process.env.DATABASE_URL = url.toString();
const { db, migrate } = await import("./db.js");
const { secureCharge, checkCounterparty, approveDecision, assertReportProof } =
  await import("./counterparty.js");
const { mountCounterparty } = await import("./counterparty-api.js");
const { config, rpc } = await import("./config.js");
type Intent = import("./counterparty-policy.js").Intent;
type Evidence = import("./counterparty-policy.js").Evidence;
const intent: Intent = {
  network: config.network as "testnet",
  agent: "buyer.testnet",
  contract: "escrow.testnet",
  receiver: "provider.testnet",
  amount: "1000",
  method: "charge",
  args: { subscription_id: "1", cycle: 0, artifact_hash: "a".repeat(64) },
};
const expected = {
  contract: intent.contract,
  receiver: intent.receiver,
  amount: intent.amount,
};
let code = "local:baseline";
const collect = async (): Promise<Evidence> => ({
  observed_at: new Date().toISOString(),
  prior_payments: 0,
  reports: (
    await db.query(
      "SELECT id,account,status,evidence_hash FROM accord_security_reports WHERE status<>'dismissed' ORDER BY id",
    )
  ).rows,
  accounts: [intent.contract, intent.receiver].map((account) => ({
    account,
    code,
    is_contract: account === intent.contract,
    block_hash: "b".repeat(44),
    block_height: 100,
    created_at: "2020-01-01T00:00:00.000Z",
    activity_count: 10,
    activity_has_more: false,
    last_activity: new Date().toISOString(),
    recent_deploy: false,
    history_available: true,
    previous_code: code,
    reviewed: true,
    code_changed: false,
    errors: [],
  })),
});
let renewalReads=0;
const app = express();
app.use(express.json());
mountCounterparty(app, async (req) => {
  const owner = req.headers["x-fixture-owner"];
  if (typeof owner !== "string") throw Error("Sign in");
  return owner;
},async()=>{
  renewalReads++;
  return {sub:{owner:intent.agent,service_id:'1',delegate_key:'fixture',input_hash:'a'.repeat(64),cycles:1,max_cycles:4,reserved:'2000',active:true,next_due_ns:'0',expires_at_ns:String(BigInt(Date.now()+60000)*1000000n)},service:{provider:intent.receiver,price:intent.amount,interval_ns:'60000000000',name:'Fixture',metadata_hash:'a'.repeat(64)},block_height:123,block_hash:'finalized-fixture'};
});
app.use(
  (
    e: Error,
    _r: express.Request,
    res: express.Response,
    _n: express.NextFunction,
  ) => {
    res.status(400).json({ error: e.message });
  },
);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
const address = server.address();
if (!address || typeof address === "string") throw Error("No address");
const base = `http://127.0.0.1:${address.port}`;
const request = async (
  path: string,
  body?: unknown,
  owner = "buyer.testnet",
) => {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "content-type": "application/json",
      ...(owner ? { "x-fixture-owner": owner } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: await r.json() };
};
const checks: string[] = [];
let signed = 0;
const sign = async () => ++signed;
try {
  assert.equal(
    (await db.query("SELECT current_schema() AS name")).rows[0].name,
    schema,
  );
  await migrate();
  await migrate();
  await assert.rejects(secureCharge(intent, expected, sign, collect), /WARN/);
  assert.equal(signed, 0);
  let decision = await checkCounterparty(intent, expected, collect);
  assert.equal((await request("/security", undefined, "")).status, 400);
  assert.equal(
    (await request("/security", undefined, "other.testnet")).body.decisions
      .length,
    0,
  );
  let body = {
    approve: true,
    intent_hash: decision.verdict.intent_hash,
    evidence_hash: decision.verdict.evidence_hash,
  };
  assert.equal(
    (await request(`/security/decisions/${decision.id}`, body, "other.testnet"))
      .status,
    400,
  );
  assert.equal(
    (
      await request(`/security/decisions/${decision.id}`, {
        ...body,
        intent_hash: "wrong",
      })
    ).status,
    400,
  );
  assert.equal(
    (await request(`/security/decisions/${decision.id}`, body)).status,
    200,
  );
  assert.equal(
    (await request(`/security/decisions/${decision.id}`, body)).status,
    400,
  );
  const racing = await Promise.allSettled([
    secureCharge(intent, expected, sign, collect),
    secureCharge(intent, expected, sign, collect),
  ]);
  assert.equal(racing.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(signed, 1);
  checks.push(
    "Real HTTP ownership + hash-bound human approval, replay rejection, concurrent approval consumed once",
  );
  decision = await checkCounterparty(
    { ...intent, args: { ...intent.args, cycle: 1 } },
    expected,
    collect,
  );
  await approveDecision(decision.id, intent.agent, {
    approve: true,
    intent_hash: decision.verdict.intent_hash,
    evidence_hash: decision.verdict.evidence_hash,
  });
  code = "local:upgraded";
  await assert.rejects(
    secureCharge(
      { ...intent, args: { ...intent.args, cycle: 1 } },
      expected,
      sign,
      collect,
    ),
    /WARN/,
  );
  assert.equal(signed, 1);
  checks.push("Code changes invalidate a previously approved payment");
  decision = await checkCounterparty(
    { ...intent, args: { ...intent.args, cycle: 2 } },
    expected,
    collect,
  );
  await db.query(
    "UPDATE accord_security_decisions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [decision.id],
  );
  await assert.rejects(
    approveDecision(decision.id, intent.agent, {
      approve: true,
      intent_hash: decision.verdict.intent_hash,
      evidence_hash: decision.verdict.evidence_hash,
    }),
  );
  decision = await checkCounterparty(
    { ...intent, args: { ...intent.args, cycle: 3 } },
    expected,
    collect,
  );
  await approveDecision(decision.id, intent.agent, {
    approve: false,
    intent_hash: decision.verdict.intent_hash,
    evidence_hash: decision.verdict.evidence_hash,
  });
  await assert.rejects(
    secureCharge(
      { ...intent, args: { ...intent.args, cycle: 3 } },
      expected,
      sign,
      collect,
    ),
    /declined/,
  );
  checks.push("Expired approval and explicit decline both stop signing");
  const hash = "C".repeat(44),
    proof = {
      final_execution_status: "FINAL",
      transaction: {
        hash,
        signer_id: "reporter.testnet",
        receiver_id: intent.receiver,
      },
      transaction_outcome: { block_hash: "B".repeat(44) },
      status: { SuccessValue: "" },
      receipts_outcome: [
        {
          id: "D".repeat(44),
          block_hash: "B".repeat(44),
          outcome: {
            executor_id: intent.receiver,
            status: { SuccessValue: "" },
          },
        },
      ],
    };
  assert.throws(() =>
    assertReportProof(proof, "unrelated.testnet", hash, "reporter.testnet"),
  );
  assert.throws(() =>
    assertReportProof(
      { ...proof, final_execution_status: "EXECUTED" },
      intent.receiver,
      hash,
      "reporter.testnet",
    ),
  );
  const originalStatus = rpc.viewTransactionStatus;
  rpc.viewTransactionStatus = async () => proof as any;
  let report: any;
  try {
    const posted = await request(
      "/security/reports",
      {
        account: intent.receiver,
        signer: "reporter.testnet",
        transaction_hash: hash,
        reason:
          "Controlled test evidence, not an allegation against a real user.",
      },
      "reporter.testnet",
    );
    assert.equal(posted.status, 200, JSON.stringify(posted));
    report = posted.body;
    assert.equal(
      (
        await request(
          "/security/reports",
          {
            account: intent.receiver,
            signer: "reporter.testnet",
            transaction_hash: hash,
            reason: "Duplicate controlled fixture evidence.",
          },
          "reporter.testnet",
        )
      ).status,
      400,
    );
  } finally {
    rpc.viewTransactionStatus = originalStatus;
  }
  const review = {
    status: "block",
    reason: "Controlled denied receiver for the attack demonstration only.",
  };
  assert.equal(
    (await request(`/security/reports/${report.id}/review`, review)).status,
    400,
  );
  process.env.SECURITY_REVIEWERS = "curator.testnet";
  assert.equal(
    (
      await request(
        `/security/reports/${report.id}/review`,
        review,
        "curator.testnet",
      )
    ).status,
    200,
  );
  await assert.rejects(secureCharge(intent, expected, sign, collect), /BLOCK/);
  assert.equal(signed, 1);
  const shared = await request("/security", undefined, "another-agent.testnet");
  assert.equal(shared.body.reports[0].status, "block");
  assert.equal(shared.body.reports[0].reviews.length, 1);
  assert.equal(
    (
      await request(
        `/security/reports/${report.id}/review`,
        {
          status: "dismissed",
          reason:
            "Fixture investigation complete; remove the controlled denial.",
        },
        "curator.testnet",
      )
    ).status,
    200,
  );
  assert.equal(
    (await db.query("SELECT count(*) FROM accord_security_reviews")).rows[0]
      .count,
    "2",
  );
  checks.push(
    "Verified evidence involvement, invalid proof rejection, duplicate rejection, curator authorization, shared block enforcement, append-only moderation history and dismissal",
  );
  // Renewal context never creates a decision, approval or signature.
  const originalContract=config.contract;
  config.contract=intent.contract;
  const baseId=randomUUID(),currentId=randomUUID();
  const before={intent,evidence:await collect(),policy:'v1'};
  const after=structuredClone(before);after.evidence.accounts[0]!.code='local:changed';
  for(const [id,owner,body,state] of [[baseId,intent.agent,before,'consumed'],[currentId,intent.agent,after,'pending']] as const)
    await db.query(`INSERT INTO accord_security_decisions(id,owner,intent_hash,evidence_hash,body,state,created_at,acted_at) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $6='consumed' THEN now()-interval '3 minutes' ELSE now()-interval '1 minute' END,CASE WHEN $6='consumed' THEN now()-interval '2 minutes' ELSE NULL END)`,[id,owner,id,id,body,state]);
  assert.equal((await request(`/security/decisions/${currentId}/renewal`,undefined,'')).status,400);
  assert.equal((await request(`/security/decisions/${currentId}/renewal`,undefined,'another-agent.testnet')).status,400);
  assert.equal(renewalReads,0);
  const countBefore=(await db.query('SELECT count(*) FROM accord_security_decisions')).rows[0].count;
  const renewal=await request(`/security/decisions/${currentId}/renewal`);
  assert.equal(renewal.status,200);
  assert.equal(renewal.body.block_height,123);
  assert.equal(renewal.body.baseline_decision.id,baseId);
  assert.equal(renewal.body.changes[0].kind,'code');
  assert.equal(renewal.body.budget.maximum_scheduled_yocto,'2000');
  assert.equal((await db.query('SELECT state FROM accord_security_decisions WHERE id=$1',[currentId])).rows[0].state,'pending');
  assert.equal((await db.query('SELECT count(*) FROM accord_security_decisions')).rows[0].count,countBefore);
  assert.equal(signed,1);
  config.contract=originalContract;
  checks.push('Renewal review isolates owners, compares prior authorization and reads bounded budget without approving, signing or creating decisions');
  console.log(
    JSON.stringify(
      { passed: true, checks, signing_calls: signed, chain_transactions: 0 },
      null,
      2,
    ),
  );
} finally {
  await new Promise<void>((r) => server.close(() => r()));
  await db.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
