import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  digest,
  seal,
  unseal,
  analyze,
  validateInput,
  verifyReport,
} from "./core.js";
const input = {
  walletAddress: "example.testnet",
  holdings: [
    { symbol: "NEAR", balance: "10", value_usd: 80 },
    { symbol: "USDC", balance: "20", value_usd: 20 },
  ],
  totalValueUsd: 100,
};
test("input and artifact hashes are stable across property order", () => {
  assert.equal(digest({ a: 1, b: 2 }), digest({ b: 2, a: 1 }));
  assert.notEqual(digest({ ...input, totalValueUsd: 101 }), digest(input));
  const report = analyze(input);
  verifyReport(report);
  assert.equal(report.risk_score, 80);
  assert.equal(report.risk_level, "high");
});
test("rejects malformed holdings and mismatching totals", () => {
  for (const value of [
    null,
    { ...input, totalValueUsd: 90 },
    { ...input, holdings: [] },
    { ...input, holdings: [{ symbol: "NEAR", balance: "1", value_usd: -1 }] },
  ])
    assert.throws(() => validateInput(value));
  assert.throws(() => verifyReport({ risk_score: 101 }));
});
test("delegate credentials use authenticated encryption with independent nonces", () => {
  const key = randomBytes(32),
    secret = "test-only-placeholder";
  const encrypted = seal(secret, key);
  assert.equal(unseal(encrypted, key), secret);
  assert.notEqual(seal(secret, key), encrypted);
  assert.throws(() => unseal(encrypted, randomBytes(32)));
  const mutated = Buffer.from(encrypted, "base64");
  mutated[15] = mutated[15]! ^ 1;
  assert.throws(() => unseal(mutated.toString("base64"), key));
});
