import { rpc, config } from "./config.js";
import { boundedJson } from "./core.js";
import { codeIdentity } from "./code-identity.js";
import { accountId, type AccountEvidence } from "./counterparty-policy.js";
const INDEXER = "https://api-testnet.nearblocks.io/v3/accounts/";
export async function readCounterparty(
  account: string,
  block: { hash: string; height: number } | null,
  previous: { code: string; changed_at?: string } | null,
  fetcher: typeof fetch = fetch,
): Promise<AccountEvidence> {
  accountId(account);
  const result: AccountEvidence = {
    account,
    code: null,
    is_contract: null,
    block_hash: null,
    block_height: null,
    created_at: null,
    activity_count: null,
    activity_has_more: false,
    last_activity: null,
    recent_deploy: false,
    history_available: false,
    previous_code: previous?.code ?? null,
    reviewed: false,
    code_changed:
      !!previous?.changed_at &&
      Date.now() - Date.parse(previous.changed_at) < 86400000,
    errors: [],
  };
  const calls = await Promise.allSettled([
    block
      ? rpc.viewAccount({
          accountId: account,
          blockQuery: { blockId: block.hash },
        })
      : Promise.reject(Error("RPC finalized block unavailable")),
    (async () => {
      if (config.network !== "testnet")
        throw Error("Indexer unavailable for sandbox");
      const get = async (path: string) => {
        const r = await fetcher(INDEXER + encodeURIComponent(account) + path, {
          signal: AbortSignal.timeout(8000),
          redirect: "error",
        });
        if (!r.ok) throw Error(`Indexer HTTP ${r.status}`);
        return boundedJson(r);
      };
      return Promise.all([get(""), get("/txns?limit=25")]);
    })(),
  ]);
  if (calls[0].status === "fulfilled") {
    try {
      const identity = codeIdentity(calls[0].value);
      result.code = identity.source + ":" + identity.hash;
      result.is_contract =
        identity.source !== "local" ||
        identity.hash !== "11111111111111111111111111111111";
      result.block_hash = block!.hash;
      result.block_height = block!.height;
      result.code_changed ||= !!previous && previous.code !== result.code;
    } catch {
      result.errors.push("RPC code identity unresolved");
    }
  } else result.errors.push("RPC account state unavailable");
  if (calls[1].status === "fulfilled") {
    try {
      const [profile, history] = calls[1].value;
      if (
        profile?.data?.account_id !== account ||
        !Array.isArray(history?.data) ||
        history.data.length > 25
      )
        throw Error("Invalid indexer response");
      const ns = profile.data.created?.block_timestamp;
      if (typeof ns === "string" && /^\d{10,25}$/.test(ns)) {
        const ms = Number(BigInt(ns) / 1000000n);
        if (ms <= Date.now()) result.created_at = new Date(ms).toISOString();
      }
      result.activity_count = history.data.length;
      result.activity_has_more = !!history.meta?.next_page;
      result.history_available = true;
      for (const tx of history.data) {
        if (
          typeof tx.block_timestamp !== "string" ||
          !/^\d{10,25}$/.test(tx.block_timestamp)
        )
          throw Error("Invalid activity timestamp");
        const time = Number(BigInt(tx.block_timestamp) / 1000000n);
        if (!result.last_activity || time > Date.parse(result.last_activity))
          result.last_activity = new Date(time).toISOString();
        if (
          tx.receiver_account_id === account &&
          time > Date.now() - 86400000 &&
          Array.isArray(tx.actions) &&
          tx.actions.some((a: any) =>
            [
              "DEPLOY_CONTRACT",
              "USE_GLOBAL_CONTRACT",
              "DEPLOY_GLOBAL_CONTRACT",
            ].includes(a.action),
          )
        )
          result.recent_deploy = true;
      }
    } catch {
      result.history_available = false;
      result.errors.push("Indexer response invalid");
    }
  } else result.errors.push("Indexer history unavailable");
  return result;
}
