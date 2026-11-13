import test from "node:test";
import assert from "node:assert/strict";
import { authorizeExecution, assertLimitedKey } from "./execution-policy.js";
import {
  providerHeaders,
  verifyProviderRequest,
  agentIdentity,
} from "./execution.js";
import { digest } from "./core.js";
const metadata = { kind: "near-wallet-watch-v1" },
  input = { account_id: "target.testnet" };
const base = {
  id: "1",
  owner: "buyer.testnet",
  input,
  paused: false,
  approved_identity: "identity",
  identity: "identity",
  enabled: true,
  sub: {
    owner: "buyer.testnet",
    service_id: "2",
    delegate_key: "ed25519:fixture",
    input_hash: digest(input),
    active: true,
    cycles: 0,
    max_cycles: 2,
    reserved: "200",
    next_due_ns: "100",
    expires_at_ns: "1000",
  },
  service: {
    provider: "provider.testnet",
    name: "test",
    metadata_hash: digest(metadata),
    price: "100",
    interval_ns: "100",
  },
  metadata,
  cycle: 0,
  now: 200n,
};
test("central authorization rejects altered owners, input, service, cadence, expiry, cycles, reserve, revocation and version drift", () => {
  authorizeExecution(base);
  for (const change of [
    { owner: "other.testnet" },
    { input: { account_id: "evil.testnet" } },
    { metadata: { kind: "injected" } },
    { paused: true },
    { enabled: false },
    { approved_identity: "old" },
    { sub: { ...base.sub, active: false } },
    { sub: { ...base.sub, next_due_ns: "300" } },
    { sub: { ...base.sub, expires_at_ns: "200" } },
    { cycle: 2 },
    { cycle: 1 },
    { sub: { ...base.sub, reserved: "99" } },
  ])
    assert.throws(() => authorizeExecution({ ...base, ...change }));
  authorizeExecution({
    ...base,
    paused: true,
    enabled: false,
    approved_identity: null,
    sub: { ...base.sub, active: false },
    receipt: { paid: true },
  });
});
test("restricted key rejects full access, broadened methods, unlimited and excessive allowance", () => {
  const FunctionCall = {
    receiver_id: "escrow.testnet",
    method_names: ["charge"],
    allowance: "100",
  };
  assertLimitedKey({ FunctionCall }, "escrow.testnet");
  for (const p of [
    "FullAccess",
    { FunctionCall: { ...FunctionCall, method_names: [] } },
    { FunctionCall: { ...FunctionCall, method_names: ["charge", "withdraw"] } },
    { FunctionCall: { ...FunctionCall, receiver_id: "evil.testnet" } },
    { FunctionCall: { ...FunctionCall, allowance: null } },
    { FunctionCall: { ...FunctionCall, allowance: "50000000000000000000001" } },
  ])
    assert.throws(() => assertLimitedKey(p, "escrow.testnet"));
});
test("provider authentication binds operation, timestamp and body; build/provider endpoint identity is explicit", () => {
  process.env.ACCORD_PROVIDER_SECRET = "test-only-authentication-secret-value";
  const body = { subscription_id: "1", cycle: 0 },
    h = providerHeaders("/prepare", body);
  verifyProviderRequest(
    "/prepare",
    body,
    h["x-accord-time"],
    h["x-accord-auth"],
  );
  for (const [path, b, t, s] of [
    ["/deliver", body, h["x-accord-time"], h["x-accord-auth"]],
    ["/prepare", { ...body, cycle: 1 }, h["x-accord-time"], h["x-accord-auth"]],
    ["/prepare", body, "1000000000000", h["x-accord-auth"]],
    ["/prepare", body, undefined, undefined],
  ] as const)
    assert.throws(() => verifyProviderRequest(path, b, t, s));
  const i = agentIdentity("2", base.service, metadata);
  assert.equal(i.capabilities.includes("sign_transactions"), false);
  assert.notEqual(
    i.hash,
    agentIdentity("2", { ...base.service, provider: "evil.testnet" }, metadata)
      .hash,
  );
  assert.notEqual(
    i.hash,
    agentIdentity("2", base.service, { ...metadata, agent_version: "2.0.0" })
      .hash,
  );
});
