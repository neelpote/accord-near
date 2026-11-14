import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateEvidence, verifyChain } from './verify-security-proof.mjs';
const read = file => readFileSync(new URL(`../docs/${file}`,import.meta.url));
const model = read('causal-agent-responses.json'), proof = read('causal-attack-proof.json');
test('recorded evidence and exported page downloads agree byte-for-byte', () => {
  validateEvidence(model,proof);
  for(const file of ['causal-agent-responses.json','causal-attack-proof.json'])
    assert.deepEqual(read(file),readFileSync(new URL(`../frontend/public/proof/${file}`,import.meta.url)));
});
test('reject changed inputs, signing activity and a confounded reputation-only test', () => {
  const m=JSON.parse(model);m.task+='changed';
  assert.throws(()=>validateEvidence(JSON.stringify(m),proof),/hash mismatch/);
  for(const mutate of [p=>p.events.find(e=>e.event==='poisoned_agent_blocked').signer_invocations=1,
    p=>p.events.find(e=>e.event==='otherwise_valid_payment_blocked_by_reputation').terms_mismatch=true,
    p=>p.control_preflight.due=false]) {
    const p=JSON.parse(proof);mutate(p);assert.throws(()=>validateEvidence(model,JSON.stringify(p)));
  }
});
test('chain verification fails closed on altered receipt, missing state or RPC outage', async () => {
  const original=globalThis.fetch,p=JSON.parse(proof);
  try {
    for(const mode of ['valid','tampered','attack-paid','missing','outage']) {
      globalThis.fetch=async (_url,options)=>{
        if(mode==='outage')return new Response('unavailable',{status:503});
        const {params}=JSON.parse(options.body);let result;
        if(params.request_type==='view_account')result={code_hash:'test-code'};
        else {
          const args=JSON.parse(Buffer.from(params.args_base64,'base64').toString());
          const control=args.subscription_id===p.control_subscription;
          let value=params.method_name==='get_receipt'?(control?p.control_receipt:null):{active:false,cycles:control?1:0};
          if(mode==='tampered'&&control&&params.method_name==='get_receipt')value={...value,amount:'1'};
          if(mode==='attack-paid'&&!control&&params.method_name==='get_receipt')value={amount:'1'};
          if(mode==='missing')value=null;
          result={result:[...Buffer.from(JSON.stringify(value))],block_height:123};
        }
        return Response.json({result});
      };
      if(mode==='valid')assert.equal((await verifyChain(p)).control_block,123);
      else await assert.rejects(verifyChain(p));
    }
  }finally{globalThis.fetch=original;}
});
