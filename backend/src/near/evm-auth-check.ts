/** Isolated HTTP/PostgreSQL auth checks. RPC outcomes are fixtures, not live Ethereum signatures. */
import "dotenv/config";
import "express-async-errors";
import express from "express";
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const original = process.env["DATABASE_URL"];
if (!original) throw Error("DATABASE_URL required");
const admin = new pg.Pool({ connectionString: original }), schema = "accord_evm_test_" + randomUUID().replaceAll("-", "");
await admin.query(`CREATE SCHEMA ${schema}`);
const url = new URL(original); url.searchParams.set("options", `-csearch_path=${schema}`); process.env["DATABASE_URL"] = url.toString();
process.env["EVM_AUTH_CONTRACT_ID"] = "login.testnet"; process.env["EVM_AUTH_CODE_HASH"] = "1".repeat(32);
const { db, migrate } = await import("./db.js"), { rpc, config } = await import("./config.js");
const { mountEvmAuth } = await import("./evm-auth.js");
let tx: any, rpcCalls = 0, codeHash = "1".repeat(32);
(rpc as any).viewAccount = async (p:any) => { assert.equal(p.blockQuery.blockId,"3".repeat(44)); rpcCalls++; return { code_hash: codeHash }; };
(rpc as any).viewTransactionStatus = async () => tx;
const app = express(); app.use(express.json());
app.use((req,res,next) => { if (req.headers.origin !== config.origin) { res.status(403).end(); return; } next(); });
mountEvmAuth(app, (_req,_res,next) => next());
app.use((e: Error,_req: express.Request,res: express.Response,_next: express.NextFunction) => { res.status(400).json({ error: e.message }); });
const server = app.listen(0,"127.0.0.1"); await new Promise<void>(r => server.once("listening",r));
const address = server.address(); if (!address || typeof address === "string") throw Error("No address");
const base = `http://127.0.0.1:${address.port}`, accountId = "0x" + "a".repeat(40), hash = "2".repeat(44);
async function request(path: string, body: object, cookie = "", origin = config.origin) {
 const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", origin, cookie }, body: JSON.stringify(body) });
 return { status: r.status, cookie: r.headers.getSetCookie().join(";"), body: r.status === 403 ? {} : await r.json() };
}
async function challenge() {
 const r = await request("/auth/evm/challenge", { accountId }); assert.equal(r.status,200); assert(r.cookie.includes("HttpOnly") && r.cookie.includes("SameSite=Strict"));
 const cookie = r.cookie.split(";")[0]!;
 tx = { final_execution_status: "FINAL", transaction: { hash, signer_id: accountId, receiver_id: accountId, actions: [{FunctionCall:{method_name:"rlp_execute"}}] }, status: {SuccessValue:""}, receipts_outcome:[{block_hash:"3".repeat(44),outcome:{executor_id:"login.testnet",status:{SuccessValue:"dHJ1ZQ=="},logs:["EVENT_JSON:"+JSON.stringify({standard:"accord_auth",version:"1.0.0",event:"login",data:[{account_id:accountId,...r.body.args}]})]}}] };
 return { body: { challenge_id: r.body.challenge_id, accountId, hash }, cookie };
}
try {
 await migrate();
 assert.equal((await request("/auth/evm/challenge",{accountId},"","https://wrong.example")).status,403);
 assert.equal((await request("/auth/evm/challenge",{accountId:"0xBAD"})).status,400);
 let c = await challenge();
 assert.equal((await request("/auth/evm/verify",c.body)).status,400); assert.equal(rpcCalls,0);
 assert.equal((await request("/auth/evm/verify",c.body,"accord_evm_login="+"0".repeat(64))).status,400); assert.equal(rpcCalls,0);
 codeHash = "3".repeat(32); assert.equal((await request("/auth/evm/verify",c.body,c.cookie)).status,400); codeHash = "1".repeat(32);
 const results = await Promise.all([request("/auth/evm/verify",c.body,c.cookie),request("/auth/evm/verify",c.body,c.cookie)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
 assert(results.find(r=>r.status===200)!.cookie.includes("accord_session="));
 assert.equal((await db.query("SELECT count(*)::int AS n FROM accord_sessions")).rows[0].n,1);
 assert.equal((await request("/auth/evm/verify",c.body,c.cookie)).status,400);
 c = await challenge(); await db.query("UPDATE accord_evm_challenges SET expires_at=now()-interval '1 second' WHERE id=$1",[c.body.challenge_id]);
 assert.equal((await request("/auth/evm/verify",c.body,c.cookie)).status,400);
 c = await challenge(); await db.query("UPDATE accord_evm_challenges SET attempts=5 WHERE id=$1",[c.body.challenge_id]);
 const callsBeforeLimit=rpcCalls;
 assert.equal((await request("/auth/evm/verify",c.body,c.cookie)).status,400); assert.equal(rpcCalls,callsBeforeLimit);
 console.log("EVM auth HTTP checks passed: browser binding, origin, code pin, expiry, one-use replay and concurrent redemption.");
} finally { server.close(); await db.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
