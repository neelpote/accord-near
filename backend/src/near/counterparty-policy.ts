import { digest } from "./core.js";
export const POLICY_VERSION = "accord-counterparty-v1";
export type Intent = { network: "testnet" | "sandbox"; agent: string; contract: string; receiver: string; method: "charge"; amount: string; args: { subscription_id: string; cycle: number; artifact_hash: string } };
export type AccountEvidence = { account: string; code: string | null; is_contract: boolean | null; block_hash: string | null; block_height: number | null; created_at: string | null; activity_count: number | null; activity_has_more: boolean; last_activity: string | null; recent_deploy: boolean; history_available: boolean; previous_code: string | null; reviewed: boolean; code_changed: boolean; errors: string[] };
export type ReportEvidence = { id: string; account: string; status: "pending" | "block" | "dismissed"; evidence_hash: string };
export type Evidence = { accounts: AccountEvidence[]; prior_payments: number; reports: ReportEvidence[]; observed_at: string };
export type Verdict = { verdict: "allow" | "warn" | "block"; reasons: { code: string; account?: string; message: string }[]; intent_hash: string; evidence_hash: string; policy: string; evidence: Evidence };
export function accountId(value: unknown): string {
  if (typeof value !== "string" || value.length > 64 || !(/^[a-z0-9]+(?:[-_.][a-z0-9]+)*\.testnet$/.test(value) || /^[0-9a-f]{64}$/.test(value) || /^0x[0-9a-f]{40}$/.test(value) || /^[a-z0-9]+(?:[-_.][a-z0-9]+)*\.sandbox$/.test(value))) throw Error("Use a valid testnet account ID");
  return value;
}
export function validateIntent(v: Intent): Intent {
  if (!v || !["testnet", "sandbox"].includes(v.network) || v.method !== "charge" || !/^\d{1,30}$/.test(v.amount) || !v.args || !/^\d{1,20}$/.test(v.args.subscription_id) || !Number.isSafeInteger(v.args.cycle) || v.args.cycle < 0 || !/^[a-f0-9]{64}$/.test(v.args.artifact_hash)) throw Error("Invalid payment intent");
  for (const id of [v.agent,v.contract,v.receiver]) { accountId(id); if(v.network==="testnet" && id.endsWith(".sandbox")) throw Error("Testnet account required"); }
  // Copy only supported fields: neither instructions nor extra transaction fields enter the signer.
  return { network:v.network,agent:v.agent,contract:v.contract,receiver:v.receiver,method:"charge",amount:v.amount,args:{subscription_id:v.args.subscription_id,cycle:v.args.cycle,artifact_hash:v.args.artifact_hash} };
}
export function evaluateCounterparty(intent: Intent, evidence: Evidence, expected: { contract: string; receiver: string; amount: string }, now = Date.now()): Verdict {
  const clean = validateIntent(intent), reasons: Verdict["reasons"] = [];
  let block = false;
  const add = (code:string,message:string,account?:string) => reasons.push({code,message,...(account?{account}:{})});
  if (clean.contract !== expected.contract || clean.receiver !== expected.receiver || clean.amount !== expected.amount) { block = true; add("TERMS_MISMATCH","Payment destination or amount differs from the on-chain agreement"); }
  if (!Number.isFinite(Date.parse(evidence.observed_at)) || now-Date.parse(evidence.observed_at)>30000 || Date.parse(evidence.observed_at)>now+5000) add("STALE_EVIDENCE","Fresh evidence is required before signing");
  for (const target of new Set([clean.contract,clean.receiver])) {
    const a = evidence.accounts.find(a=>a.account===target);
    if (!a || !a.code || !a.block_hash || a.errors.some(e=>e.startsWith("RPC"))) { add("RPC_UNAVAILABLE","Receiver state could not be verified",target); continue; }
    if (target===clean.contract && !a.is_contract) {block=true;add("MISSING_CONTRACT","The authorized payment contract has no code",target);}
    if (a.code_changed) add("CODE_CHANGED","Code differs from a previous finalized observation",target);
    if (a.recent_deploy) add("RECENT_DEPLOY","A deployment appears in the recent activity window",target);
    if (!a.reviewed && a.is_contract) add("UNREVIEWED_CODE","First observation of this contract identity",target);
    if (!a.history_available) add("HISTORY_UNAVAILABLE","Historical activity could not be retrieved",target);
    if (!a.created_at || !Number.isFinite(Date.parse(a.created_at))) add("AGE_UNKNOWN","Creation time is unknown",target);
    else if (now-Date.parse(a.created_at)<7*86400000) add("NEW_ACCOUNT","Account is less than seven days old",target);
    if (a.activity_count===0) add("NO_ACTIVITY","No transactions were found in the indexed activity window",target);
  }
  if (!evidence.prior_payments) add("FIRST_PAYMENT","No prior confirmed Accord payment to this receiver");
  for (const report of evidence.reports) {
    if (![clean.receiver,clean.contract].includes(report.account) || report.status==="dismissed") continue;
    if (report.status==="block") {block=true;add("VERIFIED_BLOCKLIST",`Curated evidence report ${report.id}`,report.account);}
    else add("PENDING_REPORT",`Unreviewed evidence report ${report.id}; not a confirmed accusation`,report.account);
  }
  // Volatile timestamps/counts do not invalidate approval; changed code, reports or risk reasons do.
  const evidence_hash = digest({policy:POLICY_VERSION,identities:evidence.accounts.map(a=>({account:a.account,code:a.code})),reports:evidence.reports,reasons});
  return {verdict:block?"block":reasons.length?"warn":"allow",reasons,intent_hash:digest(clean),evidence_hash,policy:POLICY_VERSION,evidence};
}
/** The callback is the only signing boundary. No signing on block, warning, stale or invalid evidence. */
export async function guardedSign<T>(verdict: Verdict, intent: Intent, authorized: boolean, sign: (intent: Intent)=>Promise<T>): Promise<T> {
  const clean = validateIntent(intent);
  if (verdict.intent_hash!==digest(clean) || verdict.policy!==POLICY_VERSION || Date.now()-Date.parse(verdict.evidence.observed_at)>30000 || !Number.isFinite(Date.parse(verdict.evidence.observed_at))) throw Error("Security decision is stale or does not match this payment");
  if (verdict.verdict==="block") throw Error("BLOCK: signing refused");
  if (verdict.verdict!=="allow" && !(verdict.verdict==="warn" && authorized)) throw Error("WARN: exact-payment human approval required");
  if (verdict.reasons.some(r=>r.code==="RPC_UNAVAILABLE"||r.code==="STALE_EVIDENCE")) throw Error("Fresh finalized RPC evidence required; approval cannot override missing state");
  return sign(clean);
}
