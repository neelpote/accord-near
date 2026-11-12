/** Browser control-flow fixtures only. Real relayer proof is opt-in in scripts/evm-wallet-proof.mts. */
import { test, expect, type Page } from "@playwright/test";
const ethereum = "0x" + "a".repeat(40);
async function fixture(page: Page, evm: boolean) {
  let authenticated = false, attempts = 0;
  const account = evm ? ethereum : "native.testnet";
  await page.route("**/api/near/**", async r => {
    const path = new URL(r.request().url()).pathname.split("/api/near")[1];
    let status = 200, json: any = [];
    if (path === "/config") json = { network: "testnet", contract: "escrow.testnet", rpc: "http://unused.invalid", recipient: "localhost:3100", evm_auth: { contract: "login.testnet", code_hash: "1".repeat(32) } };
    else if (path === "/me") { status = authenticated ? 200 : 401; json = authenticated ? { accountId: account } : { error: "Sign in" }; }
    else if (path === "/auth/evm/challenge") json = { challenge_id: "fixture", contract: "login.testnet", args: { challenge: "b".repeat(64), audience: "http://localhost:3100" }, gas: "30000000000000", deposit: "0", network: "testnet" };
    else if (path === "/auth/evm/verify") {
      expect(r.request().postDataJSON()).toEqual({ challenge_id: "fixture", accountId: ethereum, hash: "2".repeat(44) });
      attempts++; status = attempts === 1 ? 503 : 200; authenticated = attempts > 1; json = authenticated ? { accountId: account } : { error: "Temporary verification outage" };
    } else if (path === "/auth/challenge") json = { challenge_id: "native", nonce: Buffer.alloc(32).toString("base64"), recipient: "localhost:3100", message: "Native fixture login" };
    else if (path === "/auth/verify") { authenticated = true; json = { accountId: account }; }
    else if (path === "/pilot") json = {records:[],summary:{demand_validated:false}};
    else if (path === "/pilot/metrics") json = {disclosure:"Synthetic browser fixture; no customer validation"};
    else if (path === "/balances") json = { available: "0", earned: "0", pending: "0" };
    await r.fulfill({ status, json });
  });
  await page.route("**/manifest.json", r => {
    if (new URL(r.request().url()).hostname === "evm-on-near.dev") return evm ? r.fulfill({ json: { wallets: [{ id: "ethereum-wallets", type: "sandbox", executor: "https://evm-on-near.dev/executor.js", metadata: { signPageURL: "https://evm-on-near.dev/" }, features: { testnet: true, signAndSendTransaction: true } }] } }) : r.fulfill({ status: 503, body: "Unavailable" });
    return r.fulfill({ json: { wallets: [], version: "fixture" } });
  });
  await page.addInitScript(({account,evm}) => {
    const w = window as any; w.__evmCalls = 0; w.__messageCalls = 0;
    addEventListener("near-selector-ready", () => dispatchEvent(new CustomEvent("near-wallet-injected", { detail: {
      manifest: { id: evm ? "ethereum-wallets" : "native-fixture", name: "Wallet auth fixture", type: "injected", platform: [], version: "1", permissions: {}, features: { testnet: true, signMessage: !evm, signAndSendTransaction: true, signInWithoutAddKey: true } },
      getAccounts: async () => [{ accountId: account }], signIn: async () => [{ accountId: account }], signOut: async () => {},
      signMessage: async () => { if(evm) throw Error("EVM cannot sign NEP-413"); w.__messageCalls++; return { accountId: account, publicKey: "fixture", signature: "fixture" }; },
      signAndSendTransaction: async (p: any) => { w.__evmCalls++; if(p.actions[0].params.methodName !== "authenticate" || p.actions[0].params.deposit !== "0") throw Error("Unexpected login transaction"); return { transaction: { hash: "2".repeat(44) } }; },
    } })));
  }, {account,evm});
  await page.goto("http://localhost:3100");
  await page.getByRole("button", { name: "Sign in with NEAR" }).click();
  await page.getByText("Wallet auth fixture", { exact: true }).click();
  return account;
}
test("EVM login retries verification without another transaction or a NEP-413 request", async ({page}) => {
  await fixture(page,true);
  await expect(page.getByRole("alert").filter({hasText:"Temporary verification outage"})).toHaveText("Temporary verification outage");
  await page.getByRole("button", { name: "Sign in with NEAR" }).click();
  // near-connect may reuse its preferred wallet or show the chooser again.
  await expect.poll(async () => {
    const choice = page.getByText("Wallet auth fixture", { exact: true });
    if(await choice.isVisible()) await choice.click();
    return await page.getByRole("button", { name: ethereum, exact: true }).isVisible();
  }).toBeTruthy();
  expect(await page.evaluate(() => (window as any).__evmCalls)).toBe(1);
  expect(await page.evaluate(() => (window as any).__messageCalls)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem("accord_evm_login_pending"))).toBeNull();
});
test("native signature login remains usable when the Ethereum manifest is unavailable", async ({page}) => {
  const account = await fixture(page,false);
  await expect(page.getByRole("button", { name: account, exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__evmCalls)).toBe(0);
  expect(await page.evaluate(() => (window as any).__messageCalls)).toBe(1);
});
