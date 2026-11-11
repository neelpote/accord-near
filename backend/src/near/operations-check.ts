/** Isolated schema + HTTP checks. Auth boundary is a test stub; production NEP-413 is not bypassed. */
import "dotenv/config";
import "express-async-errors";
import assert from "node:assert/strict";
import express from "express";
import pg from "pg";
import {createServer} from "node:http";
import {randomUUID} from "node:crypto";
const original = process.env.DATABASE_URL;
if(!original)throw Error("DATABASE_URL required");
const admin=new pg.Pool({connectionString:original});
const schema="accord_ops_test_"+randomUUID().replaceAll("-","");
await admin.query(`CREATE SCHEMA ${schema}`);
const url=new URL(original);url.searchParams.set("options",`-csearch_path=${schema}`);process.env.DATABASE_URL=url.toString();
const {db,migrate}=await import("./db.js");
const {mountOperations}=await import("./operations-api.js");
const app=express();app.use(express.json());
mountOperations(app,async req=>{const account=req.headers["x-test-owner"];if(typeof account!=="string")throw Error("Unauthorized fixture");return account;});
app.use((e:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(400).json({error:e.message});});
const server=app.listen(0,"127.0.0.1");
await new Promise<void>(r=>server.once("listening",r));
const address=server.address();if(!address||typeof address==="string")throw Error("No address");
const base=`http://127.0.0.1:${address.port}`;
const checks:string[]=[];
async function request(path:string,body?:unknown,owner="alpha.testnet",method=body===undefined?"GET":"POST"){
 const r=await fetch(base+path,{method,headers:{"content-type":"application/json",...(owner?{"x-test-owner":owner}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:r.status,body:await r.json()};
}
try{
 await migrate();await migrate();
 assert.equal((await request("/pilot",undefined,"")).status,400);
 const v={role:"developer",stage:"used",problem:"Fixture code change",workaround:"Fixture script",outcome:"Synthetic test; not customer feedback"};
 const added=await request("/pilot",v);assert.equal(added.status,200);
 assert.equal((await request("/pilot",undefined,"beta.testnet")).body.records.length,0);
 assert.equal((await request(`/pilot/${added.body.id}`,undefined,"beta.testnet","DELETE")).status,400);
 const list=await request("/pilot");assert.equal(list.body.records.length,1);assert.equal(list.body.summary.demand_validated,false);
 assert.equal((await request(`/pilot/${added.body.id}`,undefined,"alpha.testnet","DELETE")).body.deleted,true);
 checks.push("Authenticated fixture access, owner isolation, honest pilot summary and feedback deletion");
 const created=await request("/workspaces",{name:"Synthetic application",accounts:["app.testnet"]});
 assert.equal(created.status,200);const workspace=created.body;
 assert.equal(workspace.baseline,null);assert.equal(workspace.monitoring,false);
 assert.equal((await request(`/workspaces/${workspace.id}`,undefined,"beta.testnet")).status,400);
 const {proposeBaseline}=await import("./workspaces.js");
 const snapshot={block_height:123,block_hash:"1".repeat(32),observed_at:new Date().toISOString(),accounts:[{account_id:"app.testnet",code_hash:"1".repeat(32),keys:[]}]};
 const proposed=await proposeBaseline(workspace.id,"alpha.testnet",async()=>snapshot);
 assert.equal((await request(`/workspaces/${workspace.id}/approve`,{proposal_hash:"wrong"})).status,400);
 assert.equal((await request(`/workspaces/${workspace.id}/approve`,{proposal_hash:proposed.proposal_hash},"beta.testnet")).status,400);
 assert.equal((await request(`/workspaces/${workspace.id}/approve`,{proposal_hash:proposed.proposal_hash})).body.version,1);
 assert.equal((await request(`/workspaces/${workspace.id}/approve`,{proposal_hash:proposed.proposal_hash})).status,400);
 await assert.rejects(proposeBaseline(workspace.id,"alpha.testnet",async()=>snapshot),/30 seconds/);
 const parallel=await Promise.all(Array.from({length:4},()=>request("/workspaces",{name:"Bounded fixture",accounts:["app.testnet"]})));
 assert.equal(parallel.filter(r=>r.status===200).length,2);
 checks.push("Workspace ownership, explicit hash-bound approval, repeated approval rejection, capture cooldown and concurrent three-workspace cap");
 const {observeWorkspace}=await import("./incidents.js");
 async function check(snapshotValue= snapshot){await db.query("UPDATE accord_workspaces SET last_capture_at=NULL WHERE id=$1",[workspace.id]);return observeWorkspace(workspace.id,async()=>snapshotValue,true);}
 const changed={...snapshot,block_height:124,accounts:[{...snapshot.accounts[0]!,code_hash:"2".repeat(32)}]};
 assert.equal((await check(changed)).changes,1);await check(changed);
 let incidents=(await db.query("SELECT * FROM accord_incidents WHERE workspace_id=$1",[workspace.id])).rows;
 assert.equal(incidents.length,1);assert.equal(incidents[0].observations,2);
 assert.equal((await db.query("SELECT count(*) FROM accord_notifications")).rows[0].count,"1");
 await check(snapshot);assert.equal((await db.query("SELECT state FROM accord_incidents")).rows[0].state,"resolved");
 await check(changed);assert.equal((await db.query("SELECT occurrences FROM accord_incidents")).rows[0].occurrences,2);
 assert.equal((await db.query("SELECT count(*) FROM accord_notifications")).rows[0].count,"2");
 await db.query("UPDATE accord_workspaces SET last_capture_at=NULL WHERE id=$1",[workspace.id]);
 await assert.rejects(observeWorkspace(workspace.id,async()=>{throw Error("RPC fixture failure")},true));
 const retained=(await db.query("SELECT last_error,last_observation FROM accord_workspaces WHERE id=$1",[workspace.id])).rows[0];
 assert(retained.last_error);assert.equal(retained.last_observation.block_height,124);
 checks.push("One incident for repeated changes, recovery and reopening, transactional notification deduplication, failed observation retains last evidence");
 const {dispatchNotifications,webhookSignature}=await import("./notifications.js");
 process.env.OPS_WEBHOOK_URL="https://receiver.example.invalid/accord";process.env.OPS_WEBHOOK_SECRET="fixture-only-signing-secret-at-least-32-characters";
 let received=0;
 const receiver=createServer(async(req,res)=>{let body="";for await(const chunk of req)body+=chunk;assert.equal(req.headers["x-accord-signature"],webhookSignature(String(req.headers["x-accord-timestamp"]),body,process.env.OPS_WEBHOOK_SECRET!));received++;res.writeHead(received===1?503:204);res.end();});
 await new Promise<void>(r=>receiver.listen(0,"127.0.0.1",r));
 try{
 const a=receiver.address();if(!a||typeof a==="string")throw Error("No receiver");
 const fixtureFetch:typeof fetch=async(_url,init)=>fetch(`http://127.0.0.1:${a.port}`,init);
 await db.query("UPDATE accord_notifications SET channel='webhook' WHERE id=(SELECT min(id) FROM accord_notifications)");
 await dispatchNotifications(fixtureFetch);
 const failed=(await db.query("SELECT * FROM accord_notifications ORDER BY id LIMIT 1")).rows[0];assert.equal(failed.state,"pending");assert.equal(failed.attempts,1);assert(failed.last_error);
 await db.query("UPDATE accord_notifications SET next_attempt_at=now() WHERE state='pending'");
 await dispatchNotifications(fixtureFetch);
 const delivered=(await db.query("SELECT * FROM accord_notifications ORDER BY id LIMIT 1")).rows[0];assert.equal(delivered.state,"delivered");assert.equal(delivered.attempts,2);assert.equal(received,2);
 await dispatchNotifications(fixtureFetch);assert.equal(received,2);
 assert.equal((await request(`/workspaces/${workspace.id}/incidents`,undefined,"beta.testnet")).status,400);
 assert.equal((await request(`/workspaces/${workspace.id}/incidents/${incidents[0].id}/acknowledge`,{})).body.acknowledged,true);
 checks.push("Signed real HTTP delivery to local receiver, persisted retry after 503, successful delivery and no redelivery, owner-scoped incident acknowledgement");
 }finally{await new Promise<void>(r=>receiver.close(()=>r()));}
 const exported=await request(`/workspaces/${workspace.id}/export`);
 const {digest}=await import("./core.js");assert.equal(digest(exported.body.body),exported.body.sha256);
 assert.equal(exported.body.body.workspace.owner,"alpha.testnet");assert(!JSON.stringify(exported.body).includes("delegate_cipher"));
 assert.equal((await request(`/workspaces/${workspace.id}/export`,undefined,"beta.testnet")).status,400);
 assert((await request(`/workspaces/${workspace.id}/events`)).body.events.length>=5);
 assert.equal((await request(`/workspaces/${workspace.id}/events?before=invalid`)).status,400);
 checks.push("Owner-scoped consistent evidence export, artifact hash verification and bounded timeline cursor validation");
 console.log(JSON.stringify({scope:"Isolated PostgreSQL schema + HTTP fixture authorization",checks},null,2));
}finally{
 await new Promise<void>(r=>server.close(()=>r()));await db.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();
}
