import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agentDefinitions,
  agentKinds,
  validateServiceInput,
  runChainAgent,
  verifyChainReport,
} from "./agents.js";
const hash = "DfcbJBckRVsGXr1v6QARgrZthYDJ1EviULqYWaokLUTX";
const input = (kind: string) =>
  agentDefinitions().find((d) => d.kind === kind)!.input_example;
function fixture(overrides: Record<string, unknown> = {}) {
  return {
    viewBlock: async () => ({
      header: {
        height: 123,
        hash,
        timestamp_nanosec: (BigInt(Date.now()) * 1000000n).toString(),
      },
    }),
    viewAccount: async () => ({
      amount: 1000000000000000000000000n,
      locked: 0n,
      storage_usage: 100,
      code_hash: hash,
    }),
    experimental_protocolConfig: async () => ({
      runtime_config: { storage_amount_per_byte: "10000000000000000000" },
    }),
    viewAccessKeyList: async () => ({
      block_height: 123,
      block_hash: hash,
      keys: [{ access_key: { permission: "FullAccess" } }],
    }),
    viewTransactionStatus: async () => ({
      final_execution_status: "FINAL",
      status: { SuccessValue: "" },
      transaction: {
        hash: "ANvufY2wASqigzqbHXRYuYj5YSXgycmMA6uQp4ti9Wap",
        signer_id: input(agentKinds[3]).signer_account_id,
        receiver_id: "demo.testnet",
      },
      transaction_outcome: { outcome: { tokens_burnt: "100" } },
      receipts_outcome: [
        { outcome: { tokens_burnt: "200", status: { SuccessValue: "" } } },
      ],
    }),
    viewNodeStatus: async () => ({
      chain_id: "testnet",
      sync_info: { syncing: false },
      validators: [{}, {}],
    }),
    viewGasPrice: async () => ({ gas_price: "100000000" }),
    ...overrides,
  } as unknown as NonNullable<Parameters<typeof runChainAgent>[2]>;
}
test("all five agent types produce bounded, kind-bound reports", async () => {
  for (const kind of agentKinds) {
    const report = await runChainAgent(kind, input(kind), fixture());
    verifyChainReport(report, kind);
    assert.equal(report.status, "ok");
    assert.equal(report.source.block_height, 123);
    assert(report.metrics.length > 0);
    assert.throws(() =>
      verifyChainReport(
        report,
        kind === agentKinds[0] ? agentKinds[1] : agentKinds[0],
      ),
    );
  }
});
test("agent inputs reject mainnet names, arbitrary URLs, extra fields and invalid thresholds", () => {
  for (const [kind, value] of [
    [agentKinds[0], { account_id: "account.near" }],
    [
      agentKinds[0],
      { account_id: "demo.testnet", minimum_available_yocto: 0.1 },
    ],
    [
      agentKinds[1],
      {
        account_id: "demo.testnet",
        trusted_contract_id: "https://evil.invalid",
      },
    ],
    [
      agentKinds[2],
      { account_id: "demo.testnet", expected_code_hash: "wrong" },
    ],
    [
      agentKinds[3],
      {
        signer_account_id: "demo.testnet",
        transaction_hash: hash,
        receipt: { SUCCESS: true },
      },
    ],
    [agentKinds[4], { max_block_age_seconds: 0 }],
  ] as const)
    assert.throws(() => validateServiceInput(kind, value));
});
test("wallet reserve calculation never uses floating point or yields negative availability", async () => {
  const r = await runChainAgent(
    agentKinds[0],
    input(agentKinds[0]),
    fixture({
      viewAccount: async () => ({
        amount: 1n,
        locked: 0n,
        storage_usage: 100,
        code_hash: hash,
      }),
    }),
  );
  assert.equal(r.status, "attention");
  assert.equal(
    r.metrics.find((m) => m.label === "Available balance · yoctoNEAR")?.value,
    "0",
  );
});
test("access guard flags broad methods and unlimited allowances without claiming compromise", async () => {
  const r = await runChainAgent(
    agentKinds[1],
    input(agentKinds[1]),
    fixture({
      viewAccessKeyList: async () => ({
        block_height: 123,
        block_hash: hash,
        keys: [
          {
            access_key: {
              permission: {
                FunctionCall: {
                  allowance: null,
                  method_names: [],
                  receiver_id: "other.testnet",
                },
              },
            },
          },
        ],
      }),
    }),
  );
  assert.equal(r.status, "attention");
  assert.equal(
    r.metrics.find((m) => m.label === "Unlimited gas allowances")?.value,
    "1",
  );
});
test("sentinel detects a baseline mismatch and receipt inspector identifies failed receipts", async () => {
  const r = await runChainAgent(
    agentKinds[2],
    { account_id: "demo.testnet", expected_code_hash: "1".repeat(32) },
    fixture(),
  );
  assert.equal(r.status, "changed");
  const tx = await runChainAgent(
    agentKinds[3],
    input(agentKinds[3]),
    fixture({
      viewTransactionStatus: async () => ({
        final_execution_status: "FINAL",
        status: { Failure: {} },
        transaction: {
          hash: input(agentKinds[3]).transaction_hash,
          signer_id: input(agentKinds[3]).signer_account_id,
          receiver_id: "demo.testnet",
        },
        transaction_outcome: { outcome: { tokens_burnt: "100" } },
        receipts_outcome: [
          { outcome: { tokens_burnt: "200", status: { Failure: {} } } },
        ],
      }),
    }),
  );
  assert.equal(tx.status, "failed");
  assert.equal(
    tx.metrics.find((m) => m.label === "Gas burned · yoctoNEAR")?.value,
    "300",
  );
});
test("network pulse flags stale blocks and rejects a wrong chain; RPC errors propagate without an invented report", async () => {
  const stale = await runChainAgent(
    agentKinds[4],
    input(agentKinds[4]),
    fixture({
      viewBlock: async () => ({
        header: { height: 123, hash, timestamp_nanosec: "0" },
      }),
    }),
  );
  assert.equal(stale.status, "attention");
  await assert.rejects(
    () =>
      runChainAgent(
        agentKinds[4],
        input(agentKinds[4]),
        fixture({
          viewNodeStatus: async () => ({
            chain_id: "mainnet",
            sync_info: { syncing: false },
            validators: [],
          }),
        }),
      ),
    /wrong network/,
  );
  await assert.rejects(
    () =>
      runChainAgent(
        agentKinds[0],
        input(agentKinds[0]),
        fixture({
          viewAccount: async () => {
            throw Error("RPC unavailable");
          },
        }),
      ),
    /RPC unavailable/,
  );
});

test("sentinel does not mistake an unresolved global reference for matching local code", async () => {
  const r = await runChainAgent(
    agentKinds[2],
    { account_id: "demo.testnet", expected_code_hash: "1".repeat(32) },
    fixture({
      viewAccount: async () => ({
        amount: 0n,
        locked: 0n,
        storage_usage: 10,
        code_hash: "1".repeat(32),
        global_contract_account_id: "global.testnet",
      }),
    }),
  );
  assert.equal(r.status, "attention");
  assert.match(r.summary, /global-contract reference/);
});
