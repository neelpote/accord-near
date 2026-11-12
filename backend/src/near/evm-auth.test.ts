import { test } from "node:test";
import assert from "node:assert/strict";
import { assertEvmLoginProof, isEthImplicit } from "./evm-auth.js";

const expected = { hash: "2".repeat(44), account: "0x" + "a".repeat(40), contract: "login.testnet", challenge: "b".repeat(64), audience: "https://accord.example" };
function proof() {
  return { final_execution_status: "FINAL", transaction: { hash: expected.hash, signer_id: expected.account, receiver_id: expected.account, actions: [{ FunctionCall: { method_name: "rlp_execute" } }] }, status: { SuccessValue: "" }, receipts_outcome: [{ block_hash: "3".repeat(44), outcome: { executor_id: expected.contract, status: { SuccessValue: "dHJ1ZQ==" }, logs: ["EVENT_JSON:" + JSON.stringify({ standard: "accord_auth", version: "1.0.0", event: "login", data: [{ account_id: expected.account, challenge: expected.challenge, audience: expected.audience }] })] } }] };
}
test("NEP-518 login requires the exact finalized wallet transaction and trusted receipt", () => {
  assertEvmLoginProof(proof(), expected);
  for (const mutate of [
    (t: any) => t.final_execution_status = "EXECUTED_OPTIMISTIC",
    (t: any) => t.transaction.hash = "wrong",
    (t: any) => t.transaction.signer_id = "attacker.testnet",
    (t: any) => t.transaction.receiver_id = "forwarder.testnet",
    (t: any) => t.transaction.actions[0].FunctionCall.method_name = "authenticate",
    (t: any) => t.status = { Failure: {} },
    (t: any) => t.receipts_outcome[0].outcome.executor_id = "fake.testnet",
    (t: any) => t.receipts_outcome.push({ outcome: { status: { Failure: {} } } }),
    (t: any) => t.receipts_outcome.push(structuredClone(t.receipts_outcome[0])),
    (t: any) => t.receipts_outcome[0].outcome.logs = [],
  ]) { const tx = proof(); mutate(tx); assert.throws(() => assertEvmLoginProof(tx, expected)); }
  for (const field of ["account", "challenge", "audience", "contract"] as const) {
    assert.throws(() => assertEvmLoginProof(proof(), { ...expected, [field]: "different" }));
  }
  assert.equal(isEthImplicit("0x" + "A".repeat(40)), false);
  assert.equal(isEthImplicit("0x1234"), false);
});
