import type { JsonRpcProvider } from "near-api-js";
import { rpc, config } from "./config.js";
import { validateInput } from "./core.js";
import { codeIdentity } from "./code-identity.js";

export const agentKinds = [
  "near-wallet-watch-v1",
  "near-access-guard-v1",
  "near-contract-sentinel-v1",
  "near-receipt-inspector-v1",
  "near-network-pulse-v1",
] as const;
export type AgentKind = (typeof agentKinds)[number];
export const isAgentKind = (kind: unknown): kind is AgentKind =>
  typeof kind === "string" && (agentKinds as readonly string[]).includes(kind);
const account = (v: unknown): string => {
  if (
    typeof v !== "string" ||
    v.length < 2 ||
    v.length > 64 ||
    !/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$/.test(v) ||
    (!v.endsWith(".testnet") &&
      !/^0x[a-f0-9]{40}$/.test(v) &&
      !/^[a-f0-9]{64}$/.test(v) &&
      !(config.network === "sandbox" && v.endsWith(".sandbox")))
  )
    throw Error("Enter a valid testnet account ID");
  return v;
};
const base58 = (v: unknown): string => {
  if (typeof v !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v))
    throw Error("Enter a base58 hash (32..44 characters)");
  return v;
};
export function validateServiceInput(
  kind: string,
  value: unknown,
): Record<string, unknown> {
  if(kind==="near-contract-risk-analyst-v1")return validateServiceInput("near-contract-sentinel-v1",value);
  if (kind === "portfolio-concentration-v1") return validateInput(value);
  if (!isAgentKind(kind)) throw Error("Unsupported agent type");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Agent input must be an object");
  const v = value as Record<string, unknown>;
  let input: Record<string, unknown>;
  switch (kind) {
    case "near-wallet-watch-v1": {
      const minimum = v["minimum_available_yocto"] ?? "50000000000000000000000";
      if (
        typeof minimum !== "string" ||
        !/^\d{1,39}$/.test(minimum) ||
        BigInt(minimum) > (1n << 128n) - 1n
      )
        throw Error("Minimum balance must be an integer yoctoNEAR string");
      input = {
        account_id: account(v["account_id"]),
        minimum_available_yocto: BigInt(minimum).toString(),
      };
      break;
    }
    case "near-access-guard-v1":
      input = {
        account_id: account(v["account_id"]),
        trusted_contract_id: account(
          v["trusted_contract_id"] ?? config.contract,
        ),
      };
      break;
    case "near-contract-sentinel-v1":
      input = {
        account_id: account(v["account_id"]),
        expected_code_hash: base58(v["expected_code_hash"]),
      };
      break;
    case "near-receipt-inspector-v1":
      input = {
        signer_account_id: account(v["signer_account_id"]),
        transaction_hash: base58(v["transaction_hash"]),
      };
      break;
    case "near-network-pulse-v1": {
      const max = v["max_block_age_seconds"] ?? 60;
      if (!Number.isInteger(max) || Number(max) < 10 || Number(max) > 3600)
        throw Error("Block age threshold must be 10..3600 seconds");
      input = { max_block_age_seconds: max };
      break;
    }
  }
  if (Object.keys(v).some((k) => !(k in input)))
    throw Error("Unexpected field in agent input");
  return input;
}
export function agentDefinitions() {
  const contract = config.contract || "contract.accord-dev-261110.testnet";
  return [
    {
      kind: agentKinds[0],
      name: "Wallet Watch",
      category: "Wallet operations",
      description:
        "Checks live account balances, protocol storage requirements and spendable gas headroom. Alerts when the reserve you choose is low.",
      input_label: "Wallet account and minimum reserve · JSON",
      input_example: {
        account_id: contract,
        minimum_available_yocto: "50000000000000000000000",
      },
    },
    {
      kind: agentKinds[1],
      name: "Access Guard",
      category: "Key permissions",
      description:
        "Reviews public access-key permissions, unlimited allowances and broad contract access. Produces a review checklist without modifying keys.",
      input_label: "Account and trusted contract · JSON",
      input_example: { account_id: contract, trusted_contract_id: contract },
    },
    {
      kind: agentKinds[2],
      name: "Contract Sentinel",
      category: "Deployment monitoring",
      description:
        "Compares a live deployed code hash with your approved baseline and flags unexpected code changes. A matching hash does not certify safety.",
      input_label: "Contract account and approved code hash · JSON",
      input_example: {
        account_id: contract,
        expected_code_hash: "DfcbJBckRVsGXr1v6QARgrZthYDJ1EviULqYWaokLUTX",
      },
    },
    {
      kind: agentKinds[3],
      name: "Receipt Inspector",
      category: "Transaction diagnostics",
      description:
        "Reads a finalized testnet transaction and its receipt outcomes, reports failures and exact gas burn. Does not treat a transaction hash as proof of a service purchase.",
      input_label: "Transaction hash and signer account · JSON",
      input_example: {
        transaction_hash: "ANvufY2wASqigzqbHXRYuYj5YSXgycmMA6uQp4ti9Wap",
        signer_account_id: contract,
      },
    },
    {
      kind: agentKinds[4],
      name: "Network Pulse",
      category: "Network operations",
      description:
        "Checks RPC network identity, finalized block freshness, gas price, synchronization and RPC-reported validators. A snapshot from the configured RPC, not a network-wide uptime guarantee.",
      input_label: "Maximum finalized-block age · JSON",
      input_example: { max_block_age_seconds: 60 },
    },
    {kind:'near-contract-risk-analyst-v1',name:'Smart Contract Risk Analyst',category:'AI contract monitoring',description:'Compares finalized code and key authority against your baseline and prior paid snapshot; a local AI explains evidence-linked changes and uncertainty. No transactions or exploit-proof claim.',input_label:'Contract account and approved code hash · JSON',input_example:{account_id:contract,expected_code_hash:'DfcbJBckRVsGXr1v6QARgrZthYDJ1EviULqYWaokLUTX'}},
  ];
}
export type ChainReport = {
  kind: AgentKind;
  title: string;
  method: "near-rpc-rules-v1";
  status: "ok" | "attention" | "changed" | "failed";
  summary: string;
  findings: string[];
  recommendations: string[];
  metrics: { label: string; value: string }[];
  observed_at: string;
  source: {
    network: string;
    block_height: number;
    block_hash: string;
    transaction_hash?: string;
  };
  disclosure: string;
};
type Client = Pick<
  JsonRpcProvider,
  | "viewBlock"
  | "viewAccount"
  | "experimental_protocolConfig"
  | "viewAccessKeyList"
  | "viewTransactionStatus"
  | "viewNodeStatus"
  | "viewGasPrice"
>;
export async function runChainAgent(
  kind: AgentKind,
  raw: unknown,
  client: Client = rpc,
): Promise<ChainReport> {
  const input = validateServiceInput(kind, raw),
    definition = agentDefinitions().find((d) => d.kind === kind)!;
  const block = await client.viewBlock({ finality: "final" });
  const source: ChainReport["source"] = {
    network: config.network,
    block_height: block.header.height,
    block_hash: block.header.hash,
  };
  const metrics: ChainReport["metrics"] = [],
    findings: string[] = [],
    recommendations: string[] = [];
  let status: ChainReport["status"] = "ok",
    summary = "";
  const metric = (label: string, value: unknown) =>
    metrics.push({ label, value: String(value) });
  switch (kind) {
    case "near-wallet-watch-v1": {
      const state = await client.viewAccount({
        accountId: String(input["account_id"]),
        blockQuery: { blockId: block.header.hash },
      });
      const protocol = await client.experimental_protocolConfig({
        blockId: block.header.hash,
      });
      const cost = protocol.runtime_config?.storage_amount_per_byte;
      if (typeof cost !== "string" || !/^\d+$/.test(cost))
        throw Error("Protocol storage cost unavailable");
      const storage = BigInt(cost) * BigInt(state.storage_usage),
        locked = BigInt(state.locked),
        total = BigInt(state.amount) + locked;
      const unavailable = locked > storage ? locked : storage,
        available = total > unavailable ? total - unavailable : 0n;
      metric("Account", input["account_id"]);
      metric("Total balance · yoctoNEAR", total);
      metric("Storage requirement · yoctoNEAR", storage);
      metric("Available balance · yoctoNEAR", available);
      metric("Locked stake · yoctoNEAR", locked);
      metric("Storage · bytes", state.storage_usage);
      const low = available < BigInt(String(input["minimum_available_yocto"]));
      status = low ? "attention" : "ok";
      summary = low
        ? "Spendable balance is below your configured reserve."
        : "Spendable balance meets your configured reserve.";
      findings.push(
        "Account and storage cost were read at the same finalized block.",
      );
      if (low)
        recommendations.push(
          "Review gas needs and fund this testnet account before its balance is exhausted.",
        );
      break;
    }
    case "near-access-guard-v1": {
      const result = await client.viewAccessKeyList({
        accountId: String(input["account_id"]),
        finalityQuery: { finality: "final" },
      });
      source.block_height = result.block_height;
      source.block_hash = result.block_hash;
      let full = 0,
        broad = 0,
        unlimited = 0,
        other = 0;
      for (const key of result.keys) {
        const p = key.access_key.permission;
        if (p === "FullAccess") {
          full++;
          continue;
        }
        if (typeof p !== "object" || !("FunctionCall" in p)) {
          other++;
          continue;
        }
        if (p.FunctionCall.allowance == null) unlimited++;
        if (
          p.FunctionCall.method_names.length === 0 ||
          p.FunctionCall.receiver_id !== input["trusted_contract_id"]
        )
          broad++;
      }
      metric("Account", input["account_id"]);
      metric("Public keys", result.keys.length);
      metric("Full-access keys", full);
      metric("Unlimited gas allowances", unlimited);
      metric("Broad / other-contract keys", broad);
      metric("Other permission types", other);
      status =
        full > 1 || unlimited > 0 || broad > 0 || other > 0
          ? "attention"
          : "ok";
      summary =
        status === "attention"
          ? "Public key permissions include items worth reviewing."
          : "No configured permission-review rule was triggered.";
      findings.push(
        "A full-access key can control this account; one is common for a wallet. Key ownership and compromise cannot be inferred from the chain.",
      );
      if (status === "attention")
        recommendations.push(
          "Review unfamiliar keys in your wallet. Confirm the purpose of broad methods, other receivers and unlimited gas allowances before removing anything.",
        );
      break;
    }
    case "near-contract-sentinel-v1": {
      const state = await client.viewAccount({
        accountId: String(input["account_id"]),
        blockQuery: { blockId: block.header.hash },
      });
      if (state.global_contract_account_id) {
        status = "attention";
        summary =
          "This account uses a global-contract reference; an account-local code hash is not a complete baseline check.";
        metric("Contract", input["account_id"]);
        metric(
          "Global reference",
          state.global_contract_hash ?? state.global_contract_account_id,
        );
        findings.push(
          "Global code resolution is not implemented by this agent. No matching-code assurance is given.",
        );
        recommendations.push(
          "Resolve and review the global contract before relying on this baseline.",
        );
        break;
      }
      const identity = codeIdentity(state);
      const actual = identity.hash;
      status = actual === input["expected_code_hash"] ? "ok" : "changed";
      summary =
        status === "changed"
          ? "Deployed code differs from your approved baseline."
          : "Deployed code matches your approved baseline.";
      metric("Contract", input["account_id"]);
      metric("Expected code hash", input["expected_code_hash"]);
      metric("Observed code hash", actual);
      if (identity.source === "global-hash") metric("Code source", "Immutable global-contract hash (NEP-591)");
      metric("Storage · bytes", state.storage_usage);
      findings.push(
        "This compares code identity, not behavior or audit quality. State changes and future upgrades are outside this snapshot.",
      );
      if (status === "changed")
        recommendations.push(
          "Inspect the deployment and pause dependent automation until you approve the new code.",
        );
      break;
    }
    case "near-receipt-inspector-v1": {
      const tx = await client.viewTransactionStatus({
        txHash: String(input["transaction_hash"]),
        accountId: String(input["signer_account_id"]),
        waitUntil: "FINAL",
      });
      if (tx.final_execution_status !== "FINAL")
        throw Error(
          "Transaction is not final; no diagnostic report will be sold yet",
        );
      if (
        tx.transaction.hash !== input["transaction_hash"] ||
        tx.transaction.signer_id !== input["signer_account_id"]
      )
        throw Error("Transaction identity mismatch");
      const failed = typeof tx.status === "object" && "Failure" in tx.status;
      const receiptFailures = tx.receipts_outcome.filter(
        (r) =>
          typeof r.outcome.status === "object" && "Failure" in r.outcome.status,
      ).length;
      const gas = tx.receipts_outcome.reduce(
        (sum, r) => sum + BigInt(r.outcome.tokens_burnt),
        BigInt(tx.transaction_outcome.outcome.tokens_burnt),
      );
      status = failed ? "failed" : receiptFailures ? "attention" : "ok";
      summary = failed
        ? "Final transaction execution failed."
        : receiptFailures
          ? "Transaction completed with failed receipt outcomes to inspect."
          : "Transaction finalized without failed receipt outcomes.";
      const executionBlock = await client.viewBlock({
        blockId: tx.transaction_outcome.block_hash,
      });
      source.block_height = executionBlock.header.height;
      source.block_hash = executionBlock.header.hash;
      source.transaction_hash = String(input["transaction_hash"]);
      metric("Transaction", tx.transaction.hash);
      metric("Signer", tx.transaction.signer_id);
      metric("Receiver", tx.transaction.receiver_id);
      metric("Finality", tx.final_execution_status);
      metric("Failed receipts", receiptFailures);
      metric("Gas burned · yoctoNEAR", gas);
      findings.push(
        "Receipt failures can be handled by later callbacks. This diagnostic does not establish delivery, recipient credit or an Accord purchase.",
      );
      if (status !== "ok")
        recommendations.push(
          "Inspect final contract state and individual receipt outcomes before deciding whether to retry an operation.",
        );
      break;
    }
    case "near-network-pulse-v1": {
      const node = await client.viewNodeStatus(),
        price = await client.viewGasPrice(block.header.hash);
      if (
        node.chain_id !== config.network &&
        !(config.network === "sandbox" && node.chain_id === "localnet")
      )
        throw Error("RPC returned the wrong network");
      const blockMs = Number(BigInt(block.header.timestamp_nanosec) / 1000000n),
        age = Math.floor((Date.now() - blockMs) / 1000);
      const stale =
        age > Number(input["max_block_age_seconds"]) ||
        age < -5 ||
        node.sync_info.syncing;
      status = stale ? "attention" : "ok";
      summary = stale
        ? "The configured RPC snapshot needs an operator review."
        : "The configured RPC is serving a recent finalized block.";
      metric("Network", node.chain_id);
      metric("Finalized height", block.header.height);
      metric("Block age · seconds", age);
      metric("RPC syncing", node.sync_info.syncing);
      metric("RPC-reported validators", node.validators.length);
      metric("Gas price · yoctoNEAR/gas", price.gas_price);
      metric("1 TGas · yoctoNEAR", BigInt(price.gas_price) * 1000000000000n);
      findings.push(
        "Freshness depends on this RPC and the provider clock; this is not a full-network consensus or availability audit.",
      );
      if (stale)
        recommendations.push(
          "Check provider clock synchronization and compare an independent testnet RPC before relying on this endpoint.",
        );
      break;
    }
  }
  const report: ChainReport = {
    kind,
    title: definition.name,
    method: "near-rpc-rules-v1",
    status,
    summary,
    metrics,
    findings,
    recommendations,
    source,
    observed_at: new Date().toISOString(),
    disclosure:
      "Live NEAR RPC data with deterministic rules. No AI inference, private-key access, automatic wallet changes or financial advice.",
  };
  verifyChainReport(report, kind);
  return report;
}
export function verifyChainReport(
  value: unknown,
  expectedKind: string,
): asserts value is ChainReport {
  const r = value as ChainReport;
  if (
    !r ||
    r.kind !== expectedKind ||
    !isAgentKind(r.kind) ||
    r.method !== "near-rpc-rules-v1" ||
    !["ok", "attention", "changed", "failed"].includes(r.status) ||
    typeof r.title !== "string" ||
    r.title.length > 80 ||
    typeof r.summary !== "string" ||
    r.summary.length > 2000 ||
    !Array.isArray(r.metrics) ||
    r.metrics.length > 20 ||
    r.metrics.length < 1 ||
    !r.metrics.every(
      (m) =>
        typeof m?.label === "string" &&
        m.label.length <= 100 &&
        typeof m.value === "string" &&
        m.value.length <= 256,
    ) ||
    !Array.isArray(r.findings) ||
    r.findings.length > 20 ||
    !r.findings.every((s) => typeof s === "string" && s.length <= 2000) ||
    !Array.isArray(r.recommendations) ||
    r.recommendations.length > 20 ||
    !r.recommendations.every(
      (s) => typeof s === "string" && s.length <= 2000,
    ) ||
    !r.source ||
    r.source.network !== config.network ||
    !Number.isSafeInteger(r.source.block_height) ||
    r.source.block_height < 0 ||
    typeof r.source.block_hash !== "string" ||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.source.block_hash) ||
    typeof r.observed_at !== "string" ||
    !Number.isFinite(Date.parse(r.observed_at)) ||
    typeof r.disclosure !== "string"
  )
    throw Error("Agent report schema/kind mismatch");
}
