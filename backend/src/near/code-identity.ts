/** NEP-591 hash references are immutable; account-ID references require separate resolution. */
export function codeIdentity(state: { code_hash: unknown; global_contract_hash?: unknown; global_contract_account_id?: unknown }) {
  if (state.global_contract_account_id) throw Error("Global contract account reference needs manual resolution");
  const global = state.global_contract_hash;
  const hash = global ?? state.code_hash;
  if (typeof hash !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(hash)) throw Error("RPC code hash unavailable");
  return { hash, source: global ? "global-hash" as const : "local" as const };
}
