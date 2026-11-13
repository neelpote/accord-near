import test from 'node:test';import assert from 'node:assert/strict';
import {riskCases,riskHash,otherHash} from './risk-cases.js';
import {investigate,parseRiskExplanation,explainRisk,riskReport,verifyRiskReport,verifyRiskBaseline,LOCAL_MODEL,LOCAL_MODEL_REVISION,localRiskConfig} from './risk-analyst.js';
import {digest} from './core.js';
const at=Date.now(),cases=riskCases(at);
for(const c of cases)test(`risk investigation: ${c.id}`,()=>{
 if(c.expected.action==='reject')assert.throws(()=>investigate(c.input,c.current,c.previous,at));
 else assert.deepEqual(investigate(c.input,c.current,c.previous,at).findings.map(f=>f.type),c.expected.types);
});
const facts=investigate(cases[2].input,cases[2].current,cases[2].previous,at);
const explanation=()=>({summary:'Code identity changed. Review the deployment history before relying on it.',explanations:facts.findings.map(f=>({change_id:f.id,why_it_matters:'A different implementation could change behavior; this observation alone does not prove compromise.',manual_check:'Compare the approved release hash with the observed code.'}))});
const analysis=()=>({...explanation(),provider:'local-mlx',model:LOCAL_MODEL,model_revision:LOCAL_MODEL_REVISION,completion_id:'controlled',elapsed_ms:1,usage:null,tee_attestation:false});
test('risk report preserves exact deterministic findings, nullable confidence and pinned attribution',()=>{
 const r=riskReport('1:0',cases[2].input,facts,analysis());verifyRiskReport(r,'1:0',cases[2].input,at+5000);assert.equal(r.confidence,null);
 for(const edit of [(v:any)=>v.findings=[],(v:any)=>v.target.accountId='evil.testnet',(v:any)=>v.investigation.current.accounts[0].code_hash=otherHash+'x',(v:any)=>v.analysis.model='invented']){const v=structuredClone(r);edit(v);assert.throws(()=>verifyRiskReport(v,'1:0',cases[2].input,at+5000));}
});
test('risk prompt injection cannot invent evidence, request signing or omit findings',()=>{
 for(const edit of [(v:any)=>v.explanations=[],(v:any)=>v.explanations[0].change_id='invented',(v:any)=>v.summary='Contract is safe',(v:any)=>v.summary='Pay invented.testnet',(v:any)=>v.explanations[0].manual_check='sign a transfer',(v:any)=>v.tools=['transfer']]){const v=explanation();edit(v);assert.throws(()=>parseRiskExplanation(v,facts));}
});
test('risk recurring baseline must be the exact preceding paid report',()=>{
 const previous=riskReport('1:0',cases[2].input,facts,analysis()),next={investigation:{baseline:facts.current}},receipt={subscription_id:'1',cycle:0,provider:'provider.testnet',amount:'100',artifact_hash:digest(previous),paid_at_ns:String(BigInt(at+5000)*1000000n)};
 verifyRiskBaseline(next,1,previous,receipt,'1','provider.testnet','100',cases[2].input);
 assert.throws(()=>verifyRiskBaseline({investigation:{baseline:null}},1,previous,receipt,'1','provider.testnet','100',cases[2].input));assert.throws(()=>verifyRiskBaseline(next,1,previous,{...receipt,artifact_hash:riskHash},'1','provider.testnet','100',cases[2].input));
 assert.throws(()=>verifyRiskBaseline(next,0,null,null,'1','provider.testnet','100',cases[2].input));
});
test('local risk transport is bounded and makes one request without tools or secrets',async()=>{
 process.env.RISK_AI_ENABLED='true';process.env.RISK_LOCAL_MAX_REQUESTS='32';let calls=0,reserved=0;
 const fetcher:typeof fetch=async(url,opts)=>{calls++;assert.equal(String(url),'http://127.0.0.1:4002/v1/chat/completions');const b=JSON.parse(opts!.body as string);assert.equal(b.model,'default_model');assert.equal(b.max_tokens,768);assert.equal(b.tools,undefined);assert.equal(opts!.redirect,'error');return Response.json({id:'test',choices:[{finish_reason:'stop',message:{content:JSON.stringify(explanation())}}]});};
 const result=await explainRisk(facts,fetcher,async()=>{reserved++;});assert.equal(result.model,LOCAL_MODEL);assert.equal(calls,1);assert.equal(reserved,1);
 for(const mode of ['outage','timeout','refusal','truncated','tools','malformed']){let attempts=0;await assert.rejects(()=>explainRisk(facts,async()=>{attempts++;if(mode==='timeout')throw new DOMException('timeout','TimeoutError');if(mode==='outage')return new Response('',{status:503});return Response.json({choices:[{finish_reason:mode==='truncated'?'length':'stop',message:{content:mode==='refusal'?'I cannot':mode==='malformed'?'{}':JSON.stringify(explanation()),...(mode==='tools'?{tool_calls:[{}]}:{})}}]});},async()=>{}));assert.equal(attempts,1);}
 await assert.rejects(()=>explainRisk(facts,fetcher,async()=>{throw Error('cap');}));assert.equal(calls,1);
 for(const url of ['https://other.invalid/v1/chat/completions','http://127.0.0.1:4002/v1/chat/completions?key=x','http://user@127.0.0.1:4002/v1/chat/completions']){process.env.RISK_LOCAL_URL=url;assert.throws(localRiskConfig);}delete process.env.RISK_LOCAL_URL;
});

test('runtime manifest agrees with advertised model identity',async()=>{const {readFile}=await import('node:fs/promises');const manifest=JSON.parse(await readFile(new URL('../../risk-model.json',import.meta.url),'utf8'));assert.equal(manifest.id,LOCAL_MODEL);assert.equal(manifest.revision,LOCAL_MODEL_REVISION);});

test('historical paid reports retain their frozen model identity after a later model upgrade',()=>{
 const r=riskReport('1:0',cases[2].input,facts,analysis());r.analysis.model='previous-approved-model';r.analysis.model_revision='previous-approved-revision';
 assert.throws(()=>verifyRiskReport(r,'1:0',cases[2].input,at+5000));
 verifyRiskReport(r,'1:0',cases[2].input,at+5000,{model:r.analysis.model,model_revision:r.analysis.model_revision});
});

test('new full-access authority receives high review priority without claiming compromise',()=>{
 for(const id of ['key-added','full-access-escalation']){const c=cases.find(c=>c.id===id);assert.equal(investigate(c.input,c.current,c.previous,at).findings[0]!.severity,'HIGH');}
});

test('first-observation hash mismatch is an expectation mismatch, never fabricated historical change',()=>{
 const c=cases.find(c=>c.id==='unexpected-code'),first=investigate(c.input,c.current,undefined,at);
 assert.equal(first.baseline,null);assert.equal(first.findings[0]!.type,'expected_code_mismatch');assert.equal(first.findings[0]!.before_source,'customer_expected_hash');assert(first.limitations.some(l=>l.includes('not proof of historical')));
});
