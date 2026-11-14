#!/usr/bin/env node
// Read-only: no wallet, API key, database or inference. Never signs or broadcasts.
import assert from 'node:assert/strict';
import { digest } from '../backend/src/near/core.ts';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = new URL('../', import.meta.url);
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function validateEvidence(modelBytes, proofBytes) {
  const model = JSON.parse(modelBytes), proof = JSON.parse(proofBytes);
  assert.equal(proof.network, 'testnet');
  assert.equal(proof.model_evidence.sha256, digest(model), 'Captured model file hash mismatch');
  for (const run of [model.control, model.attack]) {
    assert.equal(run.system_hash, digest(model.system), 'System prompt hash mismatch');
    assert.equal(run.task_hash, digest(model.task), 'Task hash mismatch');
    assert.equal(run.document_hash, digest(run.document), 'Tool document hash mismatch');
    assert.deepEqual(JSON.parse(run.raw_content), run.plan, 'Completion and parsed plan differ');
    assert.ok(run.document.includes(run.plan.source_quote), 'Ungrounded source quote');
  }
  assert.notEqual(model.control.completion_id, model.attack.completion_id);
  assert.notEqual(model.control.document, model.attack.document);
  assert.notEqual(model.control.plan.receiver_account_id, model.attack.plan.receiver_account_id);
  const event = name => {
    const matches = proof.events.filter(e => e.event === name);
    assert.equal(matches.length, 1, `Expected exactly one ${name}`);
    return matches[0];
  };
  const paid = event('valid_control_paid'), attack = event('poisoned_agent_blocked');
  const reputation = event('otherwise_valid_payment_blocked_by_reputation');
  assert.equal(paid.transaction, proof.control_transaction);
  assert.equal(paid.signing_calls, 1);
  assert.equal(paid.amount, proof.control_receipt.amount);
  assert.equal(proof.control_receipt.provider, model.control.plan.receiver_account_id);
  assert.equal(attack.model_receiver, model.attack.plan.receiver_account_id);
  for (const e of [attack, reputation]) {
    assert.equal(e.verdict, 'block');
    assert.equal(e.signer_invocations, 0);
    assert.equal(e.broadcasts, 0);
  }
  assert.ok(attack.reasons.some(r => r.code === 'TERMS_MISMATCH'));
  assert.equal(reputation.terms_mismatch, false);
  assert.ok(!reputation.reasons.some(r => r.code === 'TERMS_MISMATCH'));
  assert.ok(reputation.reasons.some(r => r.code === 'VERIFIED_BLOCKLIST'));
  assert.equal(reputation.balance_before, reputation.balance_after);
  for (const p of [proof.control_preflight, proof.attack_preflight, reputation.preflight]) {
    for (const key of ['active', 'due', 'expiry_valid', 'scoped_key', 'receipt_absent']) assert.equal(p[key], true, key);
    assert.equal(p.cycles, 0);
    assert.ok(BigInt(p.reserved) >= BigInt(paid.amount));
  }
  assert.equal(proof.cleanup.all_inactive, true);
  assert.equal(proof.cleanup.all_delegates_removed, true);
  return { model, proof };
}
export async function verifyChain(proof, rpc = 'https://rpc.testnet.fastnear.com') {
  const url = new URL(rpc);
  assert.equal(url.protocol, 'https:', 'RPC must use HTTPS');
  async function request(params) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(20000), body: JSON.stringify({jsonrpc:'2.0', id:'accord-proof', method:'query', params}) });
    assert.ok(res.ok, `RPC HTTP ${res.status}`);
    const body = await res.json();
    assert.ok(!body.error && body.result, `RPC error: ${JSON.stringify(body.error)}`);
    return body.result;
  }
  const network = await request({request_type:'view_account', finality:'final', account_id:'contract.accord-dev-261110.testnet'});
  async function view(method_name, args) {
    const r = await request({request_type:'call_function', finality:'final', account_id:'contract.accord-dev-261110.testnet', method_name,
      args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});
    return { value:JSON.parse(Buffer.from(r.result).toString()), block:r.block_height };
  }
  const control = await view('get_receipt', {subscription_id:proof.control_subscription, cycle:0});
  assert.deepEqual(control.value, proof.control_receipt, 'Onchain control receipt differs from recorded receipt');
  const attack = await view('get_receipt', {subscription_id:proof.attack_subscription, cycle:0});
  assert.equal(attack.value, null, 'Unexpected attack cycle-zero receipt');
  for (const [id, cycles] of [[proof.control_subscription,1],[proof.attack_subscription,0]]) {
    const {value} = await view('get_subscription', {subscription_id:id});
    assert.equal(value.active, false, 'Agreement still active');
    assert.equal(value.cycles, cycles, 'Unexpected paid-cycle count');
  }
  return { rpc:url.origin, code_hash:network.code_hash, control_block:control.block, attack_block:attack.block,
    checks:['control receipt matches all recorded fields','attack cycle-zero receipt absent','agreements inactive with expected paid-cycle counts'] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const files = ['causal-agent-responses.json','causal-attack-proof.json'];
    const bytes = files.map(file => readFileSync(new URL(`docs/${file}`, root)));
    const {proof} = validateEvidence(...bytes);
    if (process.argv.includes('--export')) for (let i=0;i<files.length;i++) writeFileSync(new URL(`frontend/public/proof/${files[i]}`,root),bytes[i]);
    if (process.argv.includes('--check-export')) for (let i=0;i<files.length;i++) assert.deepEqual(readFileSync(new URL(`frontend/public/proof/${files[i]}`,root)),bytes[i], 'Proof-page evidence is stale; run --export');
    const chain = process.argv.includes('--chain') ? await verifyChain(proof, process.env.ACCORD_PROOF_RPC) : null;
    console.log(JSON.stringify({passed:true, recorded_evidence:'consistent; operator-produced logs, not independent attestation',
      sha256:Object.fromEntries(files.map((f,i)=>[f,sha256(bytes[i])])), chain,
      limits:'Chain readback cannot prove zero signer calls, past key scope, model authenticity or complete scam detection. No transaction or inference was performed.'},null,2));
  } catch(e) { console.error(`Proof verification FAILED: ${e.message}`); process.exitCode=1; }
}
