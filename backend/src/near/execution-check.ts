/** Local isolated PostgreSQL/HTTP checks; controlled chain adapter, no signing or inference. */
import "dotenv/config";
import "express-async-errors";
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
const original = process.env.DATABASE_URL;
if (!original) throw Error("DATABASE_URL required");
const admin = new pg.Pool({ connectionString: original }),
  schema = "accord_execution_" + randomUUID().replaceAll("-", "");
await admin.query(`CREATE SCHEMA ${schema}`);
const u = new URL(original);
u.searchParams.set("options", "-csearch_path=" + schema);
process.env.DATABASE_URL = u.toString();
process.env.ACCORD_PROVIDER_TEST = "1";
process.env.PROVIDER_ACCOUNT_ID = "provider.testnet";
process.env.ACCORD_PROVIDER_SECRET =
  "integration-fixture-secret-not-an-api-key";
const { db, migrate } = await import("./db.js"),
  { rpc, config } = await import("./config.js"),
  { digest } = await import("./core.js"),
  { agentIdentity, providerHeaders,verifyProviderRequest } = await import("./execution.js"),
  { mountExecution } = await import("./execution-api.js");
await migrate();
await migrate();
assert.equal(
  (await db.query("SELECT current_schema() AS s")).rows[0].s,
  schema,
);
const metadata = {
    kind: "near-wallet-watch-v1",
    analysis_mode: "deterministic",
  },
  input = { account_id: "target.testnet", minimum_available_yocto: "0" },
  service = {
    provider: "provider.testnet",
    metadata_hash: digest(metadata),
    price: "100",
    interval_ns: "60000000000",
    name: "test",
  },
  sub = {
    owner: "buyer.testnet",
    service_id: "2",
    delegate_key: "key",
    input_hash: digest(input),
    active: true,
    cycles: 0,
    max_cycles: 2,
    reserved: "200",
    next_due_ns: "0",
    expires_at_ns: ((BigInt(Date.now()) + 600000n) * 1000000n).toString(),
  };
let chainReceipt:any=null;
(rpc as any).callFunction = async ({ method }: any) =>
  method === "get_subscription"
    ? sub
    : method === "get_service"
      ? service
      : method === "get_receipt" ? chainReceipt : null;
(rpc as any).viewBlock = async () => ({
  header: {
    height: 123,
    hash: "DfcbJBckRVsGXr1v6QARgrZthYDJ1EviULqYWaokLUTX",
    timestamp_nanosec: (BigInt(Date.now()) * 1000000n).toString(),
  },
});
(rpc as any).viewAccount = async () => ({
  amount: 1000000000000000000000000n,
  locked: 0n,
  storage_usage: 100,
});
(rpc as any).experimental_protocolConfig = async () => ({
  runtime_config: { storage_amount_per_byte: "10000000000000000000" },
});
await db.query("INSERT INTO accord_services(id,metadata) VALUES($1,$2)", [
  "2",
  metadata,
]);
await db.query(
  "INSERT INTO accord_subscriptions(id,owner,input,delegate_cipher) VALUES('1','buyer.testnet',$1,'no-secret')",
  [input],
);
const api = express();
api.use(express.json());
mountExecution(api, async (req) => {
  if (!req.headers["x-fixture-owner"]) throw Error("Sign in");
  return String(req.headers["x-fixture-owner"]);
});
const {mountDelivery}=await import('./delivery-api.js');mountDelivery(api,async req=>String(req.headers['x-fixture-owner']??''));
api.use((e: any, _q: any, r: any, _n: any) =>
  r.status(400).json({ error: e.message }),
);
const server = api.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.on("listening", r));
const origin = "http://127.0.0.1:" + (server.address() as any).port;
const { app: provider } = await import("./provider-server.js");
const ps = provider.listen(0, "127.0.0.1");
await new Promise<void>((r) => ps.on("listening", r));
const providerUrl = "http://127.0.0.1:" + (ps.address() as any).port;
async function call(path: string, body?: unknown, owner = "buyer.testnet") {
  const r = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", "x-fixture-owner": owner },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: await r.json() };
}
const checks: string[] = [];
try {
  const identity = agentIdentity("2", service, metadata);
  const specHash=(await call("/services/2/execution")).body.spec_hash;
  assert.equal(
    (
      await call(
        "/subscriptions/1/execution",
        { approve: true, identity_hash: identity.hash,spec_hash:specHash },
        "attacker.testnet",
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/subscriptions/1/execution", {
        approve: true,
        identity_hash: "old",spec_hash:specHash,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/subscriptions/1/execution", {
        approve: true,
        identity_hash: identity.hash,spec_hash:specHash,
      })
    ).status,
    200,
  );
  checks.push(
    "Owner-only exact advertised identity approval; changed identity rejected",
  );
  const body = {
    subscription_id: "1",
    cycle: 0,
    input,
    identity_hash: identity.hash,spec_hash:specHash,
  };
  assert.equal(
    (
      await fetch(providerUrl + "/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    ).status,
    401,
  );
  async function prepare(b = body) {
    return fetch(providerUrl + "/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...providerHeaders("/prepare", b),
      },
      body: JSON.stringify(b),
    });
  }
  const first = await prepare();
  assert.equal(first.status, 200);
  const prepared = await first.json();
  verifyProviderRequest("/prepare/response",{request_hash:digest(body),response:prepared},first.headers.get("x-accord-time"),first.headers.get("x-accord-auth"));
  assert.equal(prepared.identity_hash, identity.hash);
  assert.deepEqual(await (await prepare()).json(), prepared);
  assert.equal(
    (await db.query("SELECT count(*) FROM accord_provider_artifacts")).rows[0]
      .count,
    "1",
  );
  checks.push(
    "Authenticated provider preparation, input/identity binding, duplicate idempotency",
  );
  await call("/subscriptions/1/execution", { paused: true });
  assert.equal((await prepare()).status, 400);
  checks.push(
    "Pause stops even cached preparation; paid delivery remains separate",
  );
  assert.equal(
    (
      await call(
        "/services/2/execution",
        { enabled: false },
        "attacker.testnet",
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/services/2/execution",
        { enabled: false },
        "provider.testnet",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call("/subscriptions/1/execution", {
        approve: true,
        identity_hash: identity.hash,spec_hash:specHash,
      })
    ).status,
    400,
  );
  checks.push(
    "Provider disable requires provider identity and cannot be overridden by customer",
  );
  (rpc as any).viewAccessKeyList = async () => ({
    keys: [{ public_key: sub.delegate_key }],
  });
  assert.equal(
    (await call("/subscriptions/1/execution", { revoked: true })).status,
    400,
  );
  (rpc as any).viewAccessKeyList = async () => ({ keys: [] });
  assert.equal(
    (await call("/subscriptions/1/execution", { revoked: true })).status,
    200,
  );
  checks.push(
    "Revocation event requires finalized absent-key readback, not a browser claim",
  );
  const outsider = await call("/execution/jobs", undefined, "attacker.testnet");
  assert.equal(outsider.body.jobs.length, 0);
  assert.equal(outsider.body.events.length, 0);
  checks.push("Job and security-event data isolated by owner");

  const receipt={subscription_id:'1',cycle:0,provider:'provider.testnet',amount:'100',artifact_hash:prepared.artifact_hash,paid_at_ns:'1'};
  chainReceipt=receipt;
  const deliveryBody={subscription_id:'1',cycle:0,prepare_id:prepared.prepare_id};const delivered=await fetch(providerUrl+'/deliver',{method:'POST',headers:{'content-type':'application/json',...providerHeaders('/deliver',deliveryBody)},body:JSON.stringify(deliveryBody)});assert.equal(delivered.status,200);const delivery=await delivered.json();verifyProviderRequest('/deliver/response',{request_hash:digest(deliveryBody),response:delivery},delivered.headers.get('x-accord-time'),delivered.headers.get('x-accord-auth'));
  await db.query("INSERT INTO accord_cycles(subscription_id,cycle,state,artifact_hash,receipt,report) VALUES('1',0,'DELIVERED',$1,$2,$3)",[prepared.artifact_hash,receipt,prepared.report]);
  const {recordVerification}=await import('./delivery-store.js');
  for(const status of ['PENDING','STRUCTURE_VALID','EVIDENCE_VALID','DELIVERY_VERIFIED','DELIVERY_VERIFIED'])await recordVerification('buyer.testnet','1',0,{status,schema_valid:true,evidence_valid:status!=='PENDING',factual_correctness:'UNVERIFIED'});
  assert.equal((await db.query("SELECT count(*) FROM accord_delivery_events WHERE subscription_id='1'")).rows[0].count,'4');
  assert.equal((await call('/subscriptions/1/cycles/0/verification',undefined,'attacker.testnet')).status,400);
  assert.equal((await call('/subscriptions/1/cycles/0/feedback',{action:'dispute',reason:'Wrong owner'},'attacker.testnet')).status,400);
  assert.equal((await call('/subscriptions/1/cycles/0/feedback',{action:'respond',reason:'No dispute'},'provider.testnet')).status,400);
  assert.equal((await call('/subscriptions/1/cycles/0/feedback',{action:'accept'})).status,200);
  assert.equal((await call('/subscriptions/1/cycles/0/feedback',{action:'dispute',reason:'Conclusions need review'})).body.financial_change,false);
  assert.equal((await call('/subscriptions/1/cycles/0/feedback',{action:'respond',reason:'Provider response'},'provider.testnet')).status,200);
  assert.equal((await call('/subscriptions/1/cycles/0/feedback',{action:'accept'})).status,400);
  const disputed=(await call('/subscriptions/1/cycles/0/verification')).body;assert.equal(disputed.verification.status,'DISPUTED');assert.equal(disputed.disputes.length,2);assert.deepEqual(disputed.receipt,receipt);
  checks.push('Delivery stages are distinct and idempotent; owner dispute/provider response preserve payment and cannot self-resolve');
  console.log(
    JSON.stringify(
      { passed: true, checks, chain_transactions: 0, inference_requests: 0 },
      null,
      2,
    ),
  );
} finally {
  await new Promise<void>((r) => server.close(() => r()));
  await new Promise<void>((r) => ps.close(() => r()));
  await db.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
