import dotenv from "dotenv";
if(process.env.ACCORD_ENV_ISOLATED!=="true")dotenv.config();
import { JsonRpcProvider } from "near-api-js";
const network = process.env["NEAR_NETWORK"] ?? "testnet";
if (!["testnet", "sandbox"].includes(network))
  throw new Error("Accord currently supports testnet/sandbox only");
export const config = {
  network,
  contract: process.env["NEAR_CONTRACT_ID"] ?? "",
  rpc: process.env["NEAR_RPC_URL"] ?? "https://test.rpc.fastnear.com",
  database:
    process.env["DATABASE_URL"] ??
    "postgres://accord:accord-local-only@127.0.0.1:55432/accord",
  origin: process.env["PUBLIC_ORIGIN"] ?? "http://localhost:3000",
  provider: process.env["PROVIDER_URL"] ?? "http://127.0.0.1:4001",
  port: Number(process.env["PORT"] ?? 4000),
  providerPort: Number(process.env["PROVIDER_PORT"] ?? 4001),
};
const providerEndpoint=new URL(config.provider);
if(providerEndpoint.username||providerEndpoint.password||providerEndpoint.search||providerEndpoint.hash||!['http:','https:'].includes(providerEndpoint.protocol)||(providerEndpoint.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(providerEndpoint.hostname)))throw Error('Provider must use credential-free HTTPS or private loopback HTTP');
if (
  network === "testnet" &&
  (config.rpc.toLowerCase().includes("mainnet") ||
    (config.contract &&
      !config.contract.endsWith(".testnet") &&
      !/^[0-9a-f]{64}$/.test(config.contract)))
)
  throw new Error("Testnet configuration required");
export const rpc = new JsonRpcProvider(
  { url: config.rpc },
  { retries: 3, wait: 500, backoff: 1.5 },
);
export async function networkCheck() {
  if (
    (await rpc.getNetworkId()) !==
    (network === "sandbox" ? "localnet" : "testnet")
  )
    throw new Error("RPC network mismatch");
}
export async function view<T>(
  method: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!config.contract) throw new Error("NEAR_CONTRACT_ID is required");
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return (await rpc.callFunction({
        contractId: config.contract,
        method,
        args,
        blockQuery: { finality: "final" },
      })) as T;
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw last;
}
export type Service = {
  provider: string;
  name: string;
  metadata_hash: string;
  price: string;
  interval_ns: string;
};
export type Subscription = {
  owner: string;
  service_id: string;
  delegate_key: string;
  input_hash: string;
  max_cycles: number;
  cycles: number;
  expires_at_ns: string;
  next_due_ns: string;
  reserved: string;
  active: boolean;
};
export type Receipt = {
  subscription_id: string;
  cycle: number;
  provider: string;
  amount: string;
  artifact_hash: string;
  paid_at_ns: string;
};
