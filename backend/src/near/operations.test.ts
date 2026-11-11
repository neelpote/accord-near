import {test} from "node:test";
import assert from "node:assert/strict";
import {workspaceInput,capture,snapshotHash} from "./operations.js";
test("workspace onboarding bounds account scope and captures code and permissions at one finalized block",async()=>{
 assert.deepEqual(workspaceInput({name:" App ",accounts:["b.testnet","a.testnet"]}),{name:"App",accounts:["a.testnet","b.testnet"]});
 for(const accounts of [[],["a.near"],["a.testnet","a.testnet"],Array(6).fill("a.testnet")])assert.throws(()=>workspaceInput({name:"App",accounts}));
 const client={viewBlock:async()=>({header:{height:12,hash:"block",timestamp_nanosec:(BigInt(Date.now())*1000000n).toString()}}),viewAccount:async(v:any)=>{assert.equal(v.blockQuery.blockId,"block");return {code_hash:"code"};},sendJsonRpc:async(_method:string,v:any)=>{assert.equal(v.block_id,"block");return {keys:[{public_key:"z",access_key:{permission:{FunctionCall:{allowance:10n}}}},{public_key:"a",access_key:{permission:"FullAccess"}}]};}} as unknown as NonNullable<Parameters<typeof capture>[1]>;
 const s=await capture(["a.testnet"],client);assert.equal(s.accounts[0]!.keys[0]!.public_key,"a");assert.equal(snapshotHash(s).length,64);
 await assert.rejects(capture(["a.testnet"],{...client,viewBlock:async()=>({header:{height:12,hash:"block",timestamp_nanosec:"0"}})} as unknown as typeof client),/stale/);
 await assert.rejects(capture(["a.testnet"],{...client,viewAccount:async()=>{throw Error("RPC down");}} as typeof client),/RPC down/);
});
