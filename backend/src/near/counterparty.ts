import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { config, rpc } from "./config.js";
import { digest } from "./core.js";
import { readCounterparty } from "./counterparty-sources.js";
import {
  accountId,
  evaluateCounterparty,
  guardedSign,
  validateIntent,
  type Intent,
  type Evidence,
  type Verdict,
} from "./counterparty-policy.js";

export async function collectEvidence(intent: Intent): Promise<Evidence> {
  let block: { hash: string; height: number } | null = null;
  try {
    const b = await rpc.viewBlock({ finality: "final" });
    const time = Number(BigInt(b.header.timestamp_nanosec) / 1000000n);
    if (Date.now() - time > 60000 || time > Date.now() + 5000)
      throw Error("Stale block");
    block = { hash: b.header.hash, height: b.header.height };
  } catch {
    /* Unavailable state becomes a non-overridable warning, never allow. */
  }
  const accounts = await Promise.all(
    [...new Set([intent.contract, intent.receiver])].map(async (account) => {
      const previous = (
        await db.query(
          "SELECT code,changed_at FROM accord_security_observations WHERE account=$1",
          [account],
        )
      ).rows[0];
      const result = await readCounterparty(
        account,
        block,
        previous
          ? {
              code: previous.code,
              changed_at: previous.changed_at?.toISOString(),
            }
          : null,
      );
      const approved = (
        await db.query(
          "SELECT code FROM accord_security_codes WHERE owner=$1 AND account=$2",
          [intent.agent, account],
        )
      ).rows[0];
      result.reviewed = approved?.code === result.code;
      if (result.code && block)
        await db.query(
          `INSERT INTO accord_security_observations(account,code,block_height,body) VALUES($1,$2,$3,$4)
   ON CONFLICT(account) DO UPDATE SET changed_at=CASE WHEN accord_security_observations.code<>excluded.code THEN now() ELSE accord_security_observations.changed_at END,code=excluded.code,block_height=excluded.block_height,body=excluded.body,observed_at=now() WHERE accord_security_observations.block_height<=excluded.block_height`,
          [account, result.code, block.height, result],
        );
      return result;
    }),
  );
  const prior = await db.query(
    "SELECT count(*) FROM accord_cycles c JOIN accord_subscriptions s ON s.id=c.subscription_id WHERE s.owner=$1 AND c.receipt->>'provider'=$2 AND c.receipt IS NOT NULL",
    [intent.agent, intent.receiver],
  );
  const reports = (
    await db.query(
      "SELECT id,account,status,evidence_hash FROM accord_security_reports WHERE account=ANY($1::text[]) AND status<>'dismissed' ORDER BY id",
      [[intent.contract, intent.receiver]],
    )
  ).rows;
  return {
    accounts,
    prior_payments: Number(prior.rows[0].count),
    reports,
    observed_at: new Date().toISOString(),
  };
}
export async function checkCounterparty(
  input: Intent,
  expected: { contract: string; receiver: string; amount: string },
  collect = collectEvidence,
) {
  const intent = validateIntent(input);
  if (intent.network !== config.network)
    throw Error("Payment network mismatch");
  const evidence = await collect(intent);
  const verdict = evaluateCounterparty(intent, evidence, expected);
  // Serialize the same intent across HTTP and worker processes; never create competing approval requests.
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      intent.agent + verdict.intent_hash,
    ]);
    const old = (
      await c.query(
        "SELECT * FROM accord_security_decisions WHERE owner=$1 AND intent_hash=$2 AND evidence_hash=$3 AND (expires_at>now() OR state='declined') AND state<>'consumed' ORDER BY created_at DESC LIMIT 1",
        [intent.agent, verdict.intent_hash, verdict.evidence_hash],
      )
    ).rows[0];
    if (old) {
      await c.query("COMMIT");
      return {
        id: old.id,
        state: old.state,
        expires_at: old.expires_at,
        verdict,
        intent,
      };
    }
    const id = randomUUID(),
      state = verdict.verdict === "warn" ? "pending" : verdict.verdict;
    const row = (
      await c.query(
        "INSERT INTO accord_security_decisions(id,owner,intent_hash,evidence_hash,body,state) VALUES($1,$2,$3,$4,$5,$6) RETURNING expires_at",
        [
          id,
          intent.agent,
          verdict.intent_hash,
          verdict.evidence_hash,
          { intent, ...verdict },
          state,
        ],
      )
    ).rows[0];
    await c.query("COMMIT");
    return { id, state, expires_at: row.expires_at, verdict, intent };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function approveDecision(
  id: string,
  owner: string,
  body: { intent_hash?: unknown; evidence_hash?: unknown; approve?: unknown },
) {
  if (typeof body.approve !== "boolean")
    throw Error("Explicit approval or decline required");
  const row = (
    await db.query(
      "UPDATE accord_security_decisions SET state=$3,acted_at=now() WHERE id=$1 AND owner=$2 AND state='pending' AND expires_at>now() AND intent_hash=$4 AND evidence_hash=$5 RETURNING id,state",
      [
        id,
        owner,
        body.approve ? "approved" : "declined",
        body.intent_hash,
        body.evidence_hash,
      ],
    )
  ).rows[0];
  if (!row)
    throw Error(
      "Decision expired, changed, already reviewed or belongs to another wallet",
    );
  return row;
}
/** Mandatory production gate; private key must not be decrypted until this callback runs. */
export async function secureCharge<T>(
  input: Intent,
  expected: { contract: string; receiver: string; amount: string },
  sign: (intent: Intent) => Promise<T>,
  collect = collectEvidence,
) {
  const checked = await checkCounterparty(input, expected, collect);
  if (checked.state === "declined")
    throw Error(`Payment declined by owner (${checked.id})`);
  if (checked.verdict.verdict === "block" || checked.state === "pending")
    throw Error(
      `${checked.verdict.verdict.toUpperCase()}: payment paused; review Security decisions (${checked.id})`,
    );
  // Refresh all evidence before consuming approval; new code or reports require a new review.
  const fresh = evaluateCounterparty(
    checked.intent,
    await collect(checked.intent),
    expected,
  );
  if (fresh.evidence_hash !== checked.verdict.evidence_hash)
    throw Error("Security evidence changed; payment requires a fresh decision");
  return guardedSign(
    fresh,
    checked.intent,
    checked.state === "approved",
    async (intent) => {
      const consumed = await db.query(
        "UPDATE accord_security_decisions SET state='consumed',acted_at=now() WHERE id=$1 AND owner=$2 AND state IN ('approved','allow') AND expires_at>now() RETURNING id",
        [checked.id, intent.agent],
      );
      if (consumed.rowCount !== 1)
        throw Error("Security authorization expired or already consumed");
      if (checked.state === "approved")
        for (const a of fresh.evidence.accounts)
          if (a.code)
            await db.query(
              "INSERT INTO accord_security_codes(owner,account,code) VALUES($1,$2,$3) ON CONFLICT(owner,account) DO UPDATE SET code=excluded.code,approved_at=now()",
              [intent.agent, a.account, a.code],
            );
      return sign(intent);
    },
  );
}
export function assertReportProof(
  tx: any,
  account: string,
  hash: string,
  signer: string,
) {
  if (
    tx?.final_execution_status !== "FINAL" ||
    tx?.transaction?.hash !== hash ||
    tx.transaction.signer_id !== signer ||
    !Array.isArray(tx.receipts_outcome)
  )
    throw Error("Evidence transaction is not finalized or does not match");
  const involved =
    tx.transaction.receiver_id === account ||
    tx.transaction.signer_id === account ||
    tx.receipts_outcome.some((r: any) => r?.outcome?.executor_id === account);
  if (!involved)
    throw Error("Evidence transaction does not involve the reported account");
  // This proves involvement and outcomes, never scam intent. Curators assess the allegation separately.
  return {
    transaction_hash: hash,
    signer,
    receiver: tx.transaction.receiver_id,
    status: tx.status,
    transaction_block: tx.transaction_outcome?.block_hash,
    receipts: tx.receipts_outcome.map((r: any) => ({
      id: r.id,
      block_hash: r.block_hash,
      executor: r.outcome?.executor_id,
      status: r.outcome?.status,
    })),
  };
}
export async function submitReport(reporter: string, body: any) {
  const account = accountId(body.account),
    signer = accountId(body.signer);
  if (
    typeof body.reason !== "string" ||
    body.reason.trim().length < 15 ||
    body.reason.length > 1000 ||
    typeof body.transaction_hash !== "string" ||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.transaction_hash)
  )
    throw Error("Provide a reason (15–1000 characters) and a transaction hash");
  const tx = await rpc.viewTransactionStatus({
    txHash: body.transaction_hash,
    accountId: signer,
    waitUntil: "FINAL",
  });
  const evidence = assertReportProof(
      tx,
      account,
      body.transaction_hash,
      signer,
    ),
    evidence_hash = digest(evidence);
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "security-reports:" + reporter,
    ]);
    if (
      Number(
        (
          await c.query(
            "SELECT count(*) FROM accord_security_reports WHERE reporter=$1 AND created_at>now()-interval '1 day'",
            [reporter],
          )
        ).rows[0].count,
      ) >= 10
    )
      throw Error("Report limit reached (10 per wallet per day)");
    const row = (
      await c.query(
        "INSERT INTO accord_security_reports(id,reporter,account,reason,evidence,evidence_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(reporter,account,evidence_hash) DO NOTHING RETURNING *",
        [
          randomUUID(),
          reporter,
          account,
          body.reason.trim(),
          evidence,
          evidence_hash,
        ],
      )
    ).rows[0];
    if (!row) throw Error("This evidence was already reported by this wallet");
    await c.query("COMMIT");
    return row;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export function isReviewer(owner: string) {
  return (process.env.SECURITY_REVIEWERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(owner);
}
export async function reviewReport(id: string, owner: string, body: any) {
  if (!isReviewer(owner))
    throw Error(
      "Only configured security reviewers can curate the shared blocklist",
    );
  if (
    !["block", "dismissed", "pending"].includes(body.status) ||
    typeof body.reason !== "string" ||
    body.reason.trim().length < 15 ||
    body.reason.length > 1000
  )
    throw Error("Choose a review outcome and explain the evidence");
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    const row = await c.query(
      "UPDATE accord_security_reports SET status=$2 WHERE id=$1 RETURNING id",
      [id, body.status],
    );
    if (!row.rowCount) throw Error("Report not found");
    await c.query(
      "INSERT INTO accord_security_reviews(report_id,reviewer,status,reason) VALUES($1,$2,$3,$4)",
      [id, owner, body.status, body.reason.trim()],
    );
    await c.query("COMMIT");
    return { reviewed: true };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
