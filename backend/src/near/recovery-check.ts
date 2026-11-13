/** Fault injection for persisted recovery states. Uses an isolated PostgreSQL database;
 * reuses an ALREADY PAID testnet receipt. It never creates or signs a transaction. */
import "dotenv/config";
import assert from "node:assert/strict";
import http from "node:http";
import pg from "pg";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../..");
const originalDatabase = process.env["DATABASE_URL"]!;
if (!originalDatabase?.includes("127.0.0.1:55432/accord"))
  throw Error("Use the dedicated local development database");
const original = new pg.Pool({ connectionString: originalDatabase });
if(process.env.ACCORD_DELIVERY_LIVE==='1'){
 process.env.ACCORD_PROVIDER_SECRET=(await readFile(resolve(root,'.tools/reliability-provider-secret'),'utf8')).trim();
 if(!(await original.query("SELECT 1 FROM pg_database WHERE datname='accord_recovery'")).rowCount)await original.query('CREATE DATABASE accord_recovery');
}
const evidence = JSON.parse(
  await readFile(resolve(root, process.env.ACCORD_RECOVERY_PROOF??"docs/testnet-proof.json"), "utf8"),
);
const id = evidence.subscription_id,
  cycle = 0;
const paid = (
  await original.query(
    "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2",
    [id, cycle],
  )
).rows[0];
assert.equal(paid.state, "DELIVERED");
const local = (
  await original.query("SELECT * FROM accord_subscriptions WHERE id=$1", [id])
).rows[0];
process.env["DATABASE_URL"] = originalDatabase.replace(
  /\/accord$/,
  "/accord_recovery",
);
const { db, migrate } = await import("./db.js");
const { config, view } = await import("./config.js");
const { tick } = await import("./worker.js");
await migrate();
for (const row of (
  await original.query("SELECT id,metadata FROM accord_services")
).rows)
  await db.query(
    "INSERT INTO accord_services(id,metadata) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata",
    [row.id, row.metadata],
  );
await db.query("DELETE FROM accord_cycles");
await db.query("DELETE FROM accord_subscriptions");
await db.query(
  "INSERT INTO accord_subscriptions(id,owner,input,delegate_cipher,state,delivery_spec,delivery_spec_hash) VALUES($1,$2,$3,'no-signing-key-in-this-test','ACTIVE',$4,$5)",
  [id, local.owner, local.input,local.delivery_spec??null,local.delivery_spec_hash??null],
);
let mode = "mismatch";
const realProvider = config.provider;
const proxy = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  if (mode === "unavailable") {
    res.writeHead(503);
    res.end("Provider unavailable");
    return;
  }
  const response = await fetch(realProvider + req.url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-accord-time":String(req.headers["x-accord-time"]),"x-accord-auth":String(req.headers["x-accord-auth"]) },
    body,
  });
  const result = await response.json();
  if (mode === "mismatch") result.report = { ...result.report, risk_score: 0 };
  if (mode === "schema") result.report = { risk_score: "invented" };
  res.writeHead(response.status, { "content-type": "application/json", "x-accord-time":response.headers.get("x-accord-time")??"", "x-accord-auth":response.headers.get("x-accord-auth")??"" });
  res.end(JSON.stringify(result));
});
await new Promise<void>((r) => proxy.listen(4012, "127.0.0.1", r));
config.provider = "http://127.0.0.1:4012";
const checks: string[] = [];
async function seed(state: string) {
  await db.query("DELETE FROM accord_cycles");
  await db.query(
    "UPDATE accord_subscriptions SET state='ACTIVE',last_error=NULL WHERE id=$1",
    [id],
  );
  await db.query(
    "INSERT INTO accord_cycles(subscription_id,cycle,state,artifact_hash,prepare_id,receipt,prepared) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      id,
      cycle,
      state,
      paid.artifact_hash,
      paid.prepare_id,
      state === "SETTLED" ? paid.receipt : null,
      paid.prepared??null,
    ],
  );
}
async function status() {
  return (
    await db.query(
      "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2",
      [id, cycle],
    )
  ).rows[0];
}
const before: any = await view("get_subscription", { subscription_id: id });
try {
  await seed("SETTLED");
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO accord_cycles(subscription_id,cycle,state) VALUES($1,1,'PREPARING')",
        [id],
      ),
    (error: any) => error.code === "23505",
  );
  checks.push("Database rejects a second unresolved cycle");
  for (const fault of ["mismatch", "schema", "unavailable"]) {
    mode = fault;
    await seed("SETTLED");
    await tick();
    const row = await status();
    assert.equal(row.state, "SETTLED");
    assert.equal(row.report, null);
    assert.equal(row.artifact_hash, paid.artifact_hash);
    assert.equal(
      (await db.query("SELECT count(*) FROM accord_cycles")).rows[0].count,
      "1",
    );
    checks.push(
      `${fault}: paid-but-undelivered retained, artifact unchanged, no later cycle created`,
    );
  }
  mode = "healthy";
  for (const state of ["PREPARED", "SUBMITTING", "UNCERTAIN", "SETTLED"]) {
    await seed(state);
    await tick();
    const row = await status();
    assert.equal(row.state, "DELIVERED");
    assert.equal(row.artifact_hash, paid.artifact_hash);
    assert.deepEqual(row.report, paid.report);
    checks.push(
      `${state}: recovered existing receipt and exact prepared artifact without a signing key`,
    );
  }
  const after: any = await view("get_subscription", { subscription_id: id });
  assert.equal(after.cycles, before.cycles);
  assert.equal(after.reserved, before.reserved);
  checks.push(
    "Onchain cycle count and reserved funds unchanged throughout fault injection",
  );
  await writeFile(
    resolve(root, process.env.ACCORD_DELIVERY_LIVE==="1"?"docs/reliability/phase2-recovery.json":"docs/recovery-proof.json"),
    JSON.stringify(
      {
        kind: "Local fault injection with a pre-existing real testnet receipt; no monetary transactions submitted",
        subscription_id: id,
        cycle,
        checks,
        completed_at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log("RECOVERY ACCEPTANCE PASSED", checks.length, "checks");
} finally {
  config.provider = realProvider;
  proxy.close();
  await db.end();
  await original.end();
}
