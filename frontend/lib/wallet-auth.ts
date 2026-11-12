import { api, connector } from "./near";

const pendingKey = "accord_evm_login_pending";
export async function authenticateWallet() {
  const c = await connector();
  await c.connect();
  const w = await c.wallet();
  const accountId = (await w.getAccounts({ network: "testnet" }))[0]?.accountId;
  if (!accountId) throw Error("Wallet returned no testnet account");
  if (/^0x[0-9a-f]{40}$/.test(accountId)) {
    let pending: { accountId: string; hash: string; challenge_id: string } | null = null;
    try { pending = JSON.parse(sessionStorage.getItem(pendingKey) || "null"); } catch { sessionStorage.removeItem(pendingKey); }
    if (pending?.accountId !== accountId) pending = null;
    if (!pending) {
      const challenge = await api("/auth/evm/challenge", { accountId });
      if (challenge.network !== "testnet" || !challenge.contract?.endsWith(".testnet") || challenge.deposit !== "0") throw Error("Unexpected testnet login terms");
      const result = await w.signAndSendTransaction({ network: "testnet", signerId: accountId, receiverId: challenge.contract,
        actions: [{ type: "FunctionCall", params: { methodName: "authenticate", args: challenge.args, gas: challenge.gas, deposit: "0" } }] });
      if (!result?.transaction?.hash) throw Error("Login submitted without a NEAR transaction reference; inspect the wallet before retrying.");
      pending = { accountId, hash: result.transaction.hash, challenge_id: challenge.challenge_id };
      sessionStorage.setItem(pendingKey, JSON.stringify(pending));
    }
    try {
      await api("/auth/evm/verify", pending);
      sessionStorage.removeItem(pendingKey);
    } catch (error) {
      if (error instanceof Error && /expired|already used|another browser/.test(error.message)) sessionStorage.removeItem(pendingKey);
      throw error;
    }
    return accountId;
  }
  const challenge = await api("/auth/challenge", {});
  const signed = await w.signMessage({ network: "testnet", message: challenge.message, recipient: challenge.recipient,
    nonce: Uint8Array.from(atob(challenge.nonce), c => c.charCodeAt(0)) });
  if (signed.accountId !== accountId) throw Error("Wallet account changed during sign-in; reconnect.");
  await api("/auth/verify", { challenge_id: challenge.challenge_id, ...signed });
  return accountId;
}
