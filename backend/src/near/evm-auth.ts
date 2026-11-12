import type express from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "./db.js";
import { config, rpc } from "./config.js";
import { sessionResponse } from "./auth-session.js";

export const isEthImplicit = (value: unknown): value is string => typeof value === "string" && /^0x[0-9a-f]{40}$/.test(value);
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
export function evmAuthConfig() {
  const contract = process.env["EVM_AUTH_CONTRACT_ID"], code_hash = process.env["EVM_AUTH_CODE_HASH"];
  if (!contract || !code_hash) return null;
  if (config.network !== "testnet" || !contract.endsWith(".testnet") || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(code_hash)) throw Error("Invalid testnet authentication configuration");
  return { contract, code_hash };
}

type Expected = { hash: string; account: string; contract: string; challenge: string; audience: string };
/** Inspect trusted finalized RPC data, never an execution outcome supplied by a browser. */
export function assertEvmLoginProof(tx: any, expected: Expected) {
  const success = (s: any) => s && typeof s === "object" && "SuccessValue" in s;
  const action = tx?.transaction?.actions;
  if (!isEthImplicit(expected.account) || tx?.final_execution_status !== "FINAL" ||
      tx?.transaction?.hash !== expected.hash || tx.transaction.signer_id !== expected.account ||
      tx.transaction.receiver_id !== expected.account || !Array.isArray(action) || action.length !== 1 ||
      action[0]?.FunctionCall?.method_name !== "rlp_execute" || !success(tx.status) ||
      !Array.isArray(tx.receipts_outcome) || tx.receipts_outcome.some((r: any) => r?.outcome?.status && "Failure" in r.outcome.status)) {
    throw Error("Ethereum wallet transaction did not finalize successfully");
  }
  const matches = tx.receipts_outcome.flatMap((r: any) => {
    if (r?.outcome?.executor_id !== expected.contract || !success(r.outcome.status) || !Array.isArray(r.outcome.logs)) return [];
    return r.outcome.logs.filter((line: unknown) => {
      if (typeof line !== "string" || !line.startsWith("EVENT_JSON:")) return false;
      try {
        const event = JSON.parse(line.slice(11));
        return event.standard === "accord_auth" && event.version === "1.0.0" && event.event === "login" &&
          Array.isArray(event.data) && event.data.length === 1 &&
          event.data[0].account_id === expected.account && event.data[0].challenge === expected.challenge && event.data[0].audience === expected.audience;
      } catch { return false; }
    }).map(() => r.block_hash);
  });
  if (matches.length !== 1 || typeof matches[0] !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(matches[0])) throw Error("Login receipt does not match the requested account, challenge and site");
  return matches[0] as string;
}

export function mountEvmAuth(app: express.Express, limit: express.RequestHandler) {
  app.post("/auth/evm/challenge", limit, async (req, res) => {
    const auth = evmAuthConfig();
    if (!auth) throw Error("Ethereum wallet authentication is not configured");
    const account = req.body.accountId;
    if (!isEthImplicit(account)) throw Error("Choose an Ethereum implicit testnet account");
    const id = randomUUID(), challenge = randomBytes(32).toString("hex"), browser = randomBytes(32).toString("hex");
    await db.query("DELETE FROM accord_evm_challenges WHERE expires_at<now()");
    await db.query("INSERT INTO accord_evm_challenges(id,account_id,challenge,audience,browser_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '5 minutes')", [id, account, challenge, config.origin, sha(browser)]);
    res.cookie("accord_evm_login", browser, { httpOnly: true, sameSite: "strict", secure: config.origin.startsWith("https:"), maxAge: 300000, path: "/" });
    res.json({ challenge_id: id, contract: auth.contract, args: { challenge, audience: config.origin }, gas: "30000000000000", deposit: "0", network: "testnet" });
  });
  app.post("/auth/evm/verify", async (req, res) => {
    const auth = evmAuthConfig();
    if (!auth) throw Error("Ethereum wallet authentication is not configured");
    const { challenge_id, accountId, hash } = req.body;
    const browser = req.headers.cookie?.split(";").map(s => s.trim()).find(s => s.startsWith("accord_evm_login="))?.slice(17);
    if (!isEthImplicit(accountId) || typeof challenge_id !== "string" || !/^[0-9a-f-]{36}$/.test(challenge_id) || typeof hash !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(hash) || !browser || !/^[0-9a-f]{64}$/.test(browser)) throw Error("Invalid or missing browser-bound login proof");
    const row = (await db.query("UPDATE accord_evm_challenges SET attempts=attempts+1 WHERE id=$1 AND account_id=$2 AND browser_hash=$3 AND audience=$4 AND expires_at>now() AND attempts<5 RETURNING *", [challenge_id, accountId, sha(browser), config.origin])).rows[0];
    if (!row) throw Error("Login challenge expired, used, or belongs to another browser");
    const tx = await rpc.viewTransactionStatus({ txHash: hash, accountId, waitUntil: "FINAL" });
    const executionBlock = assertEvmLoginProof(tx, { hash, account: accountId, contract: auth.contract, challenge: row.challenge, audience: config.origin });
    const account = await rpc.viewAccount({ accountId: auth.contract, blockQuery: { blockId: executionBlock } });
    if (account.code_hash !== auth.code_hash) throw Error("Authentication contract code changed; login is paused");
    const token = randomBytes(32).toString("hex");
    const inserted = await db.query("WITH consumed AS (DELETE FROM accord_evm_challenges WHERE id=$1 AND account_id=$2 AND browser_hash=$3 AND audience=$4 AND expires_at>now() RETURNING id) INSERT INTO accord_sessions(token_hash,account_id,expires_at) SELECT $5,$2,now()+interval '12 hours' FROM consumed RETURNING account_id", [challenge_id, accountId, sha(browser), config.origin, sha(token)]);
    if (inserted.rowCount !== 1) throw Error("Login challenge expired or already used");
    res.clearCookie("accord_evm_login", { path: "/" });
    sessionResponse(res, token, accountId);
  });
}
