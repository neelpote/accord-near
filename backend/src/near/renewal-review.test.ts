import test from 'node:test';
import assert from 'node:assert/strict';
import {renewalReview,type ReviewRecord} from './renewal-review.js';
import type {Subscription,Service} from './config.js';
const now=1794650000000;
const record:ReviewRecord={policy:'v1',intent:{network:'testnet',agent:'owner.testnet',contract:'escrow.testnet',receiver:'provider.testnet',method:'charge',amount:'1000000000000000000000',args:{subscription_id:'1',cycle:0,artifact_hash:'a'.repeat(64)}},evidence:{accounts:[],reports:[],prior_payments:1,observed_at:new Date(now).toISOString()}};
const service:Service={provider:'provider.testnet',price:record.intent.amount,interval_ns:'60000000000',name:'Monitor',metadata_hash:'a'.repeat(64)};
const sub:Subscription={owner:'owner.testnet',service_id:'1',delegate_key:'fixture',input_hash:'a'.repeat(64),cycles:2,max_cycles:5,reserved:'2500000000000000000000',active:true,next_due_ns:'0',expires_at_ns:String(BigInt(now+60000)*1000000n)};
test('renewal comparison highlights changed identities and evidence, but not routine cycle/artifact changes',()=>{
  const previous=structuredClone(record),current=structuredClone(record);
  previous.evidence.accounts=[{account:'escrow.testnet',code:'local:before'} as any];
  current.evidence.accounts=[{account:'escrow.testnet',code:'local:after'} as any];
  current.evidence.reports=[{id:'report1',account:'provider.testnet',status:'block',evidence_hash:'b'.repeat(64)}];
  current.intent.args.cycle=1;current.intent.args.artifact_hash='c'.repeat(64);
  const review=renewalReview(current,previous,sub,service,now);
  assert.deepEqual(review.changes.map(c=>c.kind),['code','report']);
  assert.equal(review.changes[0]?.before,'local:before');
  assert.equal(review.budget.maximum_scheduled_yocto,sub.reserved);
  assert.equal(review.budget.remaining_reports,3);
  assert.equal(review.terms_match,true);
  assert.deepEqual(renewalReview(current,null,sub,service,now).changes,[]);
  assert.equal(renewalReview(current,null,sub,service,now).baseline,'first review');
});
test('scheduled budget is capped by reports and reserve, zero after cancellation/expiry, and exact above safe-integer range',()=>{
  assert.equal(renewalReview(record,null,{...sub,reserved:'900000000000000000000000'},service,now).budget.maximum_scheduled_yocto,'3000000000000000000000');
  for(const override of [{active:false},{expires_at_ns:String(BigInt(now)*1000000n)},{cycles:5}])assert.equal(renewalReview(record,null,{...sub,...override},service,now).budget.maximum_scheduled_yocto,'0');
  assert.equal(renewalReview(record,null,sub,{...service,provider:'other.testnet'},now).terms_match,false);
});
test('unrelated baselines, other owners and invalid chain numbers fail closed',()=>{
  assert.throws(()=>renewalReview(record,{...record,intent:{...record.intent,agent:'other.testnet'}},sub,service,now),/Unrelated/);
  assert.throws(()=>renewalReview(record,null,{...sub,owner:'other.testnet'},service,now),/owner/);
  assert.throws(()=>renewalReview(record,null,{...sub,cycles:6},service,now),/cycle/);
  assert.throws(()=>renewalReview(record,null,{...sub,reserved:'-1'},service,now),/amount/);
});
