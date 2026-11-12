import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCounterparty,guardedSign,validateIntent,type Intent,type Evidence} from "./counterparty-policy.js";
export const intent:Intent={network:"testnet",agent:"buyer.testnet",contract:"escrow.testnet",receiver:"provider.testnet",method:"charge",amount:"1000",args:{subscription_id:"1",cycle:0,artifact_hash:"a".repeat(64)}};
const expected={contract:intent.contract,receiver:intent.receiver,amount:intent.amount};
export function cleanEvidence():Evidence{return {observed_at:new Date().toISOString(),prior_payments:1,reports:[],accounts:[intent.contract,intent.receiver].map(account=>({account,code:"local:"+"1".repeat(32),is_contract:account===intent.contract,block_hash:"a".repeat(44),block_height:100,created_at:"2020-01-01T00:00:00.000Z",activity_count:25,activity_has_more:true,last_activity:new Date().toISOString(),recent_deploy:false,history_available:true,previous_code:"local:"+"1".repeat(32),reviewed:true,code_changed:false,errors:[]}))};}
test("allow signs exactly the immutable intent; a changed destination or argument never signs",async()=>{
 const e=cleanEvidence(),v=evaluateCounterparty(intent,e,expected);assert.equal(v.verdict,"allow");let signed=0;
 await guardedSign(v,intent,false,async i=>{assert.deepEqual(i,intent);signed++;});
 await assert.rejects(guardedSign(v,{...intent,receiver:"bad.testnet"},true,async()=>signed++));
 await assert.rejects(guardedSign(v,{...intent,args:{...intent.args,cycle:1}},true,async()=>signed++));assert.equal(signed,1);
});
test("curated block cannot be approved; pending report warns; dismissed reports do not block",async()=>{
 const e=cleanEvidence();e.reports=[{id:"fixture",account:intent.receiver,status:"block",evidence_hash:"e"}];let signed=0;
 const v=evaluateCounterparty(intent,e,expected);assert.equal(v.verdict,"block");await assert.rejects(guardedSign(v,intent,true,async()=>signed++));assert.equal(signed,0);
 e.reports[0]!.status="pending";assert.equal(evaluateCounterparty(intent,e,expected).verdict,"warn");e.reports[0]!.status="dismissed";assert.equal(evaluateCounterparty(intent,e,expected).verdict,"allow");
});
test("warn refuses until exact human authorization; missing RPC and stale data cannot be overridden",async()=>{
 const e=cleanEvidence();e.accounts[0]!.code_changed=true;const v=evaluateCounterparty(intent,e,expected);assert.equal(v.verdict,"warn");let signed=0;
 await assert.rejects(guardedSign(v,intent,false,async()=>signed++));await guardedSign(v,intent,true,async()=>signed++);assert.equal(signed,1);
 e.accounts[0]!.errors=["RPC unavailable"];await assert.rejects(guardedSign(evaluateCounterparty(intent,e,expected),intent,true,async()=>signed++));
 e.observed_at=new Date(Date.now()-60000).toISOString();await assert.rejects(guardedSign(evaluateCounterparty(intent,e,expected),intent,true,async()=>signed++));assert.equal(signed,1);
});
test("fresh account, absent history, unreviewed code and first payment all have reasons; new evidence changes the binding",()=>{
 const e=cleanEvidence();e.prior_payments=0;e.accounts[0]!.created_at=null;e.accounts[0]!.history_available=false;e.accounts[0]!.reviewed=false;
 const v=evaluateCounterparty(intent,e,expected);for(const code of ["FIRST_PAYMENT","AGE_UNKNOWN","HISTORY_UNAVAILABLE","UNREVIEWED_CODE"])assert(v.reasons.some(r=>r.code===code));
 e.accounts[0]!.code="local:changed";assert.notEqual(evaluateCounterparty(intent,e,expected).evidence_hash,v.evidence_hash);
 assert.equal(evaluateCounterparty({...intent,amount:"2000"},e,expected).verdict,"block");
 assert.throws(()=>validateIntent({...intent,contract:"evil.near"}));assert.throws(()=>validateIntent({...intent,contract:"evil.sandbox"}));
});
