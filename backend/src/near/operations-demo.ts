/** Controlled testnet identity-change demo; never deploys to the Accord escrow account. */
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {execFileSync} from "node:child_process";
import {Account,actions} from "near-api-js";
import {AccountDoesNotExistError} from "near-api-js/rpc-errors";
import {signMessage} from "near-api-js/nep413";
import {fixtureKey} from "./fixture-keys.js";
import {config,rpc,networkCheck} from "./config.js";
import {digest} from "./core.js";
const root=resolve(import.meta.dirname,"../../..");
await networkCheck();assert.equal(config.network,"testnet");
const saved=JSON.parse(await readFile(resolve(root,".near-credentials/buyer.json"),"utf8"));
assert(saved.account_id.startsWith("buyer.")&&saved.account_id.endsWith(".testnet"));
const buyer=new Account(saved.account_id,rpc,saved.private_key);
const canaryId=`canary.${buyer.accountId}`;
assert.notEqual(canaryId,config.contract);
async function exists(){try{await rpc.viewAccount({accountId:canaryId});return true;}catch(e){if(e instanceof AccountDoesNotExistError)return false;throw e;}}
const key=await fixtureKey(resolve(root,".near-credentials/operations-canary.json"),canaryId,exists);
const transactions:{method:string;hash:string}[]=[];
async function transact(actor:Account,receiver:string,txActions:Parameters<Account["signAndSendTransaction"]>[0]["actions"],method:string){
 const tx=await actor.signAndSendTransaction({receiverId:receiver,actions:txActions});
 const final=await rpc.viewTransactionStatus({txHash:tx.transaction.hash,accountId:actor.accountId,waitUntil:"FINAL"});
 assert.equal(final.final_execution_status,"FINAL");assert(typeof final.status==="object"&&"SuccessValue" in final.status);transactions.push({method,hash:tx.transaction.hash});
}
if(!await exists())await transact(buyer,canaryId,[actions.createAccount(),actions.transfer(50000000000000000000000n),actions.addFullAccessKey(key.getPublicKey())],"create_disposable_canary");
const canary=new Account(canaryId,rpc,key.toString());
// Minimal no-op ping + memory export. Only a custom-section marker changes between versions.
const base=Uint8Array.from([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,3,1,0,1,7,17,2,6,109,101,109,111,114,121,2,0,4,112,105,110,103,0,0,10,4,1,2,0,11]);
const wasm=(marker:number)=>Uint8Array.from([...base,0,8,6,97,99,99,111,114,100,marker]);
assert(WebAssembly.validate(wasm(1)));assert(WebAssembly.validate(wasm(2)));
const escrowBefore=(await rpc.viewAccount({accountId:config.contract})).code_hash;
await transact(canary,canaryId,[actions.deployContract(wasm(1))],"deploy_canary_marker_v1");
let cookie="";
async function request(path:string,body?:unknown){
 const response=await fetch("http://127.0.0.1:4000"+path,{method:body===undefined?"GET":"POST",headers:{origin:config.origin,"content-type":"application/json",cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json();if(!response.ok)throw Error(`${path}: ${result.error}`);return {result,response};
}
const c=(await request("/auth/challenge",{})).result;
const signed=await signMessage({signerAccount:buyer,payload:{message:c.message,recipient:c.recipient,nonce:Buffer.from(c.nonce,"base64")}});
const auth=await request("/auth/verify",{challenge_id:c.challenge_id,accountId:buyer.accountId,publicKey:signed.publicKey.toString(),signature:Buffer.from(signed.signature).toString("base64")});
cookie=auth.response.headers.get("set-cookie")!.split(";")[0]!;
const old=(await request("/workspaces")).result;
const name="Controlled testnet canary";
let workspace=old.find((w:any)=>w.name===name&&w.accounts.includes(canaryId));
if(!workspace)workspace=(await request("/workspaces",{name,accounts:[canaryId,config.contract]})).result;
// Explicit pause before replacing a developer-fixture baseline; never alters customer workspaces.
await request(`/workspaces/${workspace.id}/monitoring`,{enabled:false,webhook_enabled:false});
async function captureProposal(){for(let i=0;i<10;i++){try{return (await request(`/workspaces/${workspace.id}/capture`,{})).result;}catch(e){if(!(e as Error).message.includes("30 seconds"))throw e;await new Promise(r=>setTimeout(r,4000));}}throw Error("Capture cooldown did not clear");}
const proposed=await captureProposal();
await request(`/workspaces/${workspace.id}/approve`,{proposal_hash:proposed.proposal_hash});
await request(`/workspaces/${workspace.id}/monitoring`,{enabled:true,webhook_enabled:false});
await transact(canary,canaryId,[actions.deployContract(wasm(2))],"deploy_canary_marker_v2");
let incident:any;
for(let attempt=0;attempt<50;attempt++){
 const rows=(await request(`/workspaces/${workspace.id}/incidents`)).result;
 incident=rows.find((i:any)=>i.type==='code_changed'&&i.account_id===canaryId&&i.state==='open'&&i.baseline_version===workspace.baseline_version+1);
 if(incident)break;
 await new Promise(r=>setTimeout(r,3000));
}
assert(incident,"The actual background worker must detect the finalized code identity change");
await request(`/workspaces/${workspace.id}/incidents/${incident.id}/acknowledge`,{});
let ai="not requested";
if(process.env.OPS_DEMO_AI==="1"){
 const report=(await request(`/workspaces/${workspace.id}/incidents/${incident.id}/explain`,{})).result;
 assert.equal(report.explanation.provider,"groq");ai="Actual Groq explanation recorded separately in evidence timeline";
}
// Link existing real paid evidence; never labels it as a purchase of the canary check.
const original=JSON.parse(await readFile(resolve(root,"docs/agents-demo-proof.json"),"utf8"));
const paid=original.agents.find((a:any)=>a.kind==='near-wallet-watch-v1');
await request(`/workspaces/${workspace.id}/reports`,{subscription_id:paid.subscription_id,cycle:0});
await request(`/workspaces/${workspace.id}/monitoring`,{enabled:false,webhook_enabled:false});
const exported=(await request(`/workspaces/${workspace.id}/export`)).result;
assert.equal(digest(exported.body),exported.sha256);
assert.equal((await rpc.viewAccount({accountId:config.contract})).code_hash,escrowBefore);
const proof={network:"testnet",source_commit:execFileSync("git",["rev-parse","HEAD"],{cwd:root}).toString().trim(),source_dirty:!!execFileSync("git",["status","--porcelain"],{cwd:root}).toString().trim(),scope:"Controlled no-op WASM custom-section identity change; not an exploit or behavior change. Background detection is unbilled. Linked Wallet Watch report is historical paid evidence for the separate escrow account.",workspace_id:workspace.id,canary:canaryId,transactions,ai,escrow_code_hash_unchanged:escrowBefore,incident,evidence_export:exported,completed_at:new Date().toISOString()};
await writeFile(resolve(root,"docs/operations-demo-proof.json"),JSON.stringify(proof,null,2)+"\n");
await writeFile(resolve(root,".tools/operations-demo-browser.json"),JSON.stringify({cookie,workspace_id:workspace.id,account_id:buyer.accountId}),{mode:0o600});
console.log("CONTROLLED OPERATIONS DEMO PASSED",workspace.id,canaryId);
