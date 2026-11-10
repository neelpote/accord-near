/** Real testnet UI journey through a fixture wallet implementing NEAR Connect's public injection API.
 * No private key enters the page; signing uses dedicated developer accounts in the Node test process.
 * This verifies the connector boundary; it does not certify each third-party wallet's redirect UI.
 */
import { test, expect } from "@playwright/test";
import { Account, JsonRpcProvider, actions, PublicKey } from "near-api-js";
import { signMessage } from "near-api-js/nep413";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
test("wallet sign-in → agreement → limited key → report → cancellation → exit", async ({
  page,
}) => {
  test.skip(
    process.env.ACCORD_LIVE_BROWSER !== "1",
    "Explicitly opt into free testnet transactions with ACCORD_LIVE_BROWSER=1",
  );
  const root = resolve(process.cwd(), "..");
  const key = JSON.parse(
    await readFile(resolve(root, ".near-credentials/buyer.json"), "utf8"),
  );
  if (
    !key.account_id.startsWith("buyer.") ||
    !key.account_id.endsWith(".testnet")
  )
    throw Error("Dedicated testnet buyer fixture required");
  const rpc = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" });
  if ((await rpc.getNetworkId()) !== "testnet") throw Error("Testnet only");
  const buyer = new Account(key.account_id, rpc, key.private_key);
  const config = await (
    await fetch("http://localhost:3000/api/near/config")
  ).json();
  const transactions: { method: string; hash: string }[] = [];
  await page.exposeFunction("__accordFixtureSign", async (params: any) => {
    if (params.network !== "testnet") throw Error("Testnet only");
    const signed = await signMessage({
      signerAccount: buyer,
      payload: {
        message: params.message,
        recipient: params.recipient,
        nonce: Uint8Array.from(params.nonce),
      },
    });
    return {
      accountId: buyer.accountId,
      publicKey: signed.publicKey.toString(),
      signature: Buffer.from(signed.signature).toString("base64"),
    };
  });
  await page.exposeFunction("__accordFixtureSend", async (params: any) => {
    if (
      params.network !== "testnet" ||
      params.signerId !== buyer.accountId ||
      ![buyer.accountId, config.contract].includes(params.receiverId)
    )
      throw Error("Fixture boundary rejected signer/recipient");
    const converted = params.actions.map((a: any) => {
      if (
        a.type === "FunctionCall" &&
        params.receiverId === config.contract &&
        ["subscribe", "cancel", "withdraw"].includes(a.params.methodName)
      )
        return actions.functionCall(
          a.params.methodName,
          a.params.args,
          BigInt(a.params.gas),
          BigInt(a.params.deposit),
        );
      if (a.type === "AddKey" && params.receiverId === buyer.accountId) {
        const p = a.params.accessKey.permission;
        if (
          p.receiverId !== config.contract ||
          JSON.stringify(p.methodNames) !== '["charge"]' ||
          BigInt(p.allowance) > 50000000000000000000000n
        )
          throw Error("Unsafe fixture key");
        return actions.addFunctionCallAccessKey(
          PublicKey.fromString(a.params.publicKey),
          p.receiverId,
          p.methodNames,
          BigInt(p.allowance),
        );
      }
      if (a.type === "DeleteKey" && params.receiverId === buyer.accountId)
        return actions.deleteKey(PublicKey.fromString(a.params.publicKey));
      throw Error("Unsupported fixture action");
    });
    const result = await buyer.signAndSendTransaction({
      receiverId: params.receiverId,
      actions: converted,
    });
    transactions.push({
      method: params.actions[0].params.methodName ?? params.actions[0].type,
      hash: result.transaction.hash,
    });
    return JSON.parse(
      JSON.stringify(result, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
  });
  await page.route("**/manifest.json", (r) =>
    r.fulfill({ json: { wallets: [], version: "fixture" } }),
  );
  await page.addInitScript(
    ({ accountId }) => {
      const w = window as any;
      window.addEventListener("near-selector-ready", () =>
        window.dispatchEvent(
          new CustomEvent("near-wallet-injected", {
            detail: {
              manifest: {
                id: "accord-testnet-fixture",
                name: "Accord testnet fixture",
                description: "Dedicated testnet acceptance wallet",
                platform: [],
                website: "http://localhost",
                version: "1",
                executor: "",
                type: "injected",
                permissions: {},
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
                features: {
                  testnet: true,
                  mainnet: false,
                  signMessage: true,
                  signAndSendTransaction: true,
                  signInWithoutAddKey: true,
                },
              },
              getAccounts: async () => [{ accountId }],
              signIn: async () => [{ accountId }],
              signOut: async () => {},
              signMessage: async (p: any) =>
                w.__accordFixtureSign({ ...p, nonce: Array.from(p.nonce) }),
              signAndSendTransaction: async (p: any) =>
                w.__accordFixtureSend(p),
            },
          }),
        ),
      );
    },
    { accountId: buyer.accountId },
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in with NEAR" }).click();
  const fixture = page.getByText("Accord testnet fixture", { exact: true });
  await fixture.click({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: buyer.accountId, exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "Choose terms →" }).first().click();
  await page
    .getByRole("button", { name: "Approve and fund agreement" })
    .click();
  await expect(
    page.getByRole("button", { name: "Enable automatic purchases" }),
  ).toBeEnabled({ timeout: 120000 });
  const pending = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("accord_pending")!),
  );
  await page
    .getByRole("button", { name: "Enable automatic purchases" })
    .click();
  const agreement = page.locator("article.panel").filter({
    has: page.getByRole("heading", {
      name: `Agreement #${pending.subscription_id}`,
      exact: true,
    }),
  });
  await expect(
    agreement.getByText("Paid · delivered", { exact: true }),
  ).toBeVisible({ timeout: 160000 });
  await expect(
    agreement.getByText("high concentration risk", { exact: true }),
  ).toBeVisible();
  await mkdir(resolve(root, "docs/demo"), { recursive: true });
  await page.screenshot({
    path: resolve(root, "docs/demo/marketplace-and-delivery.png"),
    fullPage: true,
  });
  await agreement
    .getByRole("button", { name: "Cancel future purchases" })
    .click();
  await expect(agreement.getByText("Canceled", { exact: true })).toBeVisible({
    timeout: 90000,
  });
  await agreement.getByRole("button", { name: "Remove limited key" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Limited key removed" }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    page.getByRole("button", { name: "Withdraw remainder", exact: true }),
  ).toBeEnabled();
  const beforeExit = (await buyer.getState()).balance.total;
  await page
    .getByRole("button", { name: "Withdraw remainder", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Withdrawal submitted" }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Waiting for wallet or network confirmation" }),
  ).not.toBeVisible({ timeout: 90000 });
  await expect(
    page.getByRole("button", { name: "Withdraw remainder", exact: true }),
  ).toBeDisabled();
  expect((await buyer.getState()).balance.total).toBeGreaterThan(beforeExit);
  expect(transactions.some((t) => t.method === "withdraw")).toBeTruthy();
  expect(errors).toEqual([]);
  await writeFile(
    resolve(root, "docs/browser-testnet-proof.json"),
    JSON.stringify(
      {
        network: "testnet",
        contract: config.contract,
        subscription_id: pending.subscription_id,
        transactions,
        completed_at: new Date().toISOString(),
        wallet:
          "Test fixture through standard NEAR Connect injection API; real NEP-413 signatures and testnet transactions, no third-party wallet UI certification.",
      },
      null,
      2,
    ) + "\n",
  );
});

// Record the real acceptance journey when explicitly requested; never publish traces/cookies.
test.afterEach(async ({ page }, info) => {
  if (process.env.ACCORD_RECORD_DEMO === "1" && info.status === "passed") {
    const video = page.video();
    if (video) {
      await page.close();
      await video.saveAs(
        resolve(process.cwd(), "../docs/demo/accord-testnet-demo.webm"),
      );
    }
  }
});
