import { test } from "node:test";
import assert from "node:assert/strict";
import { codeIdentity } from "./code-identity.js";
import { validateServiceInput } from "./agents.js";

test("Ethereum implicit accounts use immutable global code identity rather than the empty local hash", () => {
  const hash = "3PpYvRxBfC5BkZxTw8ZFG3D52w1ZRhvDDWirKoxphMDn";
  assert.deepEqual(codeIdentity({ code_hash: "1".repeat(32), global_contract_hash: hash }), { hash, source: "global-hash" });
  assert.throws(() => codeIdentity({ code_hash: "1".repeat(32), global_contract_account_id: "mutable.testnet" }), /manual resolution/);
  assert.throws(() => codeIdentity({ code_hash: "1".repeat(32), global_contract_hash: "malformed" }));
  assert.equal(validateServiceInput("near-wallet-watch-v1", { account_id: "0x" + "a".repeat(40) }).account_id, "0x" + "a".repeat(40));
  assert.throws(() => validateServiceInput("near-wallet-watch-v1", { account_id: "0x" + "A".repeat(40) }));
});
