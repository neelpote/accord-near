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
  const riskMode=process.env.ACCORD_RISK_WALLET==='1';
  let cleanupId='',cleanupKey='';
  const started = Date.now(),
    videoEvents: { event: string; elapsed_ms: number }[] = [];
  const mark = (event: string) => {
    videoEvents.push({ event, elapsed_ms: Date.now() - started });
    console.log("WALLET",event);
  };
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
    await fetch(
      (process.env.ACCORD_BASE_URL || "http://localhost:3000") +
        "/api/near/config",
    )
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
    if(riskMode&&params.actions[0]?.params.methodName==='subscribe')cleanupKey=params.actions[0].params.args.delegate_key;
    const result = await buyer.signAndSendTransaction({
      receiverId: params.receiverId,
      actions: converted,
    });
    if(riskMode&&params.actions[0]?.params.methodName==='subscribe'&&typeof result.status==='object'&&'SuccessValue' in result.status)cleanupId=JSON.parse(Buffer.from(result.status.SuccessValue,'base64').toString());
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
  mark("open_app");
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in with NEAR" }).click();
  const fixture = page.getByText("Accord testnet fixture", { exact: true });
  await fixture.click({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: buyer.accountId, exact: true }),
  ).toBeVisible({ timeout: 90000 });
  mark("signed_in");
  if(riskMode)await page.locator("article.service").filter({has:page.getByRole("heading",{name:"Smart Contract Risk Analyst",exact:true})}).getByRole("button",{name:"Choose terms →"}).click();
  else if (process.env.ACCORD_AGENT_UI === "1")
    await page
      .locator("article.service")
      .filter({
        has: page.getByRole("heading", { name: "Wallet Watch", exact: true }),
      })
      .getByRole("button", { name: "Choose terms →" })
      .click();
  else
    await page.getByRole("button", { name: "Choose terms →" }).first().click();
  if (process.env.ACCORD_SECURITY_DEMO === "1")
    await page
      .locator("#service-terms textarea")
      .fill(
        JSON.stringify({
          account_id: buyer.accountId,
          minimum_available_yocto: "50000000000000000000000",
        }),
      );
  try{
  if(riskMode){await page.getByLabel("Maximum reports",{exact:true}).fill("2");const spec=page.getByRole("region",{name:"Service delivery specification"});await spec.getByText("Inspect service delivery specification before approval",{exact:true}).click();await expect(spec.locator("pre")).toContainText("near-contract-risk-analyst-v1");await expect(spec.locator("pre")).toContainText("model_revision");mark("frozen_spec_reviewed");}
  mark("fund_agreement");
  await page
    .getByRole("button", { name: "Approve and fund agreement" })
    .click();
  await expect(
    page.getByRole("button", { name: "Enable automatic purchases" }),
  ).toBeEnabled({ timeout: 120000 });
  mark("agreement_funded");
  const pending = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("accord_pending")!),
  );
  cleanupId=pending.subscription_id;cleanupKey=pending.public_key;
  await page
    .getByRole("button", { name: "Enable automatic purchases" })
    .click();
  const agreement = page.locator("article.panel").filter({
    has: page.getByRole("heading", {
      name: `Agreement #${pending.subscription_id}`,
      exact: true,
    }),
  });
  if(riskMode){await expect(agreement.getByRole("heading",{name:`Agreement #${pending.subscription_id}`,exact:true})).toBeVisible({timeout:90000});await expect(agreement.locator(".eyebrow").first()).toHaveText("Smart Contract Risk Analyst");await agreement.getByRole("button",{name:"Approve this execution identity"}).click();}
  // A warning needs one owner-fixture review; an already-allowed payment can deliver directly.
  const approval = page
    .locator("#security article")
    .filter({
      hasText: `Agreement ${pending.subscription_id} · cycle 0`,
    })
    .first()
    .getByRole("button", {
      name: "Approve this exact payment once",
      exact: true,
    });
  let securityWarningApproved = false;
  await Promise.race([
    approval.waitFor({ state: "visible", timeout: 160000 }),
    agreement
      .getByText("Paid · delivered", { exact: true })
      .waitFor({ timeout: 160000 }),
  ]);
  if (await approval.isVisible()) {
    mark("warning_visible");
    if (process.env.ACCORD_RECORD_DEMO === "1") await page.waitForTimeout(2200);
    await approval.click();
    mark("warning_approved");
    securityWarningApproved = true;
  }
  await expect(
    agreement.getByText("Paid · delivered", { exact: true }),
  ).toBeVisible({ timeout: 160000 });
  await expect(
    riskMode?agreement.getByRole("heading",{name:"Smart Contract Risk Analyst",exact:true}):process.env.ACCORD_AGENT_UI === "1"
      ? agreement.getByRole("heading", { name: "Wallet Watch", exact: true })
      : agreement.getByText("high concentration risk", { exact: true }),
  ).toBeVisible();
  mark("report_delivered");
  if(riskMode){await page.screenshot({path:resolve(root,"docs/demo/reliability-risk-wallet.png"),fullPage:true});await agreement.screenshot({path:resolve(root,"docs/demo/reliability-risk-verification.png"),style:"header, .skip-link { visibility:hidden !important; }"});}
  await mkdir(resolve(root, "docs/demo"), { recursive: true });
  await page.screenshot({
    path: resolve(
      root,
      riskMode?"docs/demo/reliability-risk-wallet.png":process.env.ACCORD_SECURITY_DEMO === "1"
        ? "docs/demo/security-native-wallet.png"
        : process.env.ACCORD_HOSTED === "1"
          ? "docs/demo/hosted-wallet-watch.png"
          : process.env.ACCORD_AGENT_UI === "1"
            ? process.env.ACCORD_REDESIGN === "1"
              ? process.env.ACCORD_EDITORIAL === "1"
                ? "docs/demo/editorial-wallet-watch.png"
                : "docs/demo/redesign-wallet-watch.png"
              : "docs/demo/wallet-watch-live.png"
            : "docs/demo/marketplace-and-delivery.png",
    ),
    fullPage: process.env.ACCORD_SECURITY_DEMO !== "1",
  });
  mark("cancel_clicked");
  await agreement
    .getByRole("button", { name: "Cancel future purchases" })
    .click();
  await expect(agreement.getByText("Canceled", { exact: true })).toBeVisible({
    timeout: 90000,
  });
  mark("canceled");
  await agreement.getByRole("button", { name: "Remove limited key" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Limited key removed" }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    page.getByRole("button", { name: "Withdraw remainder", exact: true }),
  ).toBeEnabled();
  mark("key_removed");
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
  mark("withdrawal_confirmed");
  expect(errors).toEqual([]);
  await writeFile(
    resolve(
      root,
      riskMode?"docs/reliability/phase3-wallet.json":process.env.ACCORD_SECURITY_DEMO === "1"
        ? "docs/security-native-wallet-proof.json"
        : process.env.ACCORD_HOSTED === "1"
          ? "docs/hosted-wallet-proof.json"
          : process.env.ACCORD_AGENT_UI === "1"
            ? process.env.ACCORD_REDESIGN === "1"
              ? process.env.ACCORD_EDITORIAL === "1"
                ? "docs/editorial-wallet-proof.json"
                : "docs/redesign-wallet-proof.json"
              : "docs/browser-live-agent-proof.json"
            : "docs/browser-testnet-proof.json",
    ),
    JSON.stringify(
      {
        network: "testnet",
        origin: process.env.ACCORD_BASE_URL || "http://localhost:3000",
        contract: config.contract,
        subscription_id: pending.subscription_id,
        approved_cycle_limit:riskMode?2:3,
        exact_security_warning_approved: securityWarningApproved,
        ...(riskMode?{delegate_key:pending.public_key,paid_cycles:await page.evaluate(async(id)=>{const rows=await (await fetch("/api/near/subscriptions")).json();return rows.find((s:any)=>s.id===id).cycles.map((c:any)=>({cycle:c.cycle,state:c.state,artifact_hash:c.artifact_hash,receipt:c.receipt,verification:c.verification,payment_tx:c.payment_tx,delivered_at:c.delivered_at}));},pending.subscription_id)}:{}),
        video_events: videoEvents,
        transactions,
        completed_at: new Date().toISOString(),
        wallet:
          "Test fixture through standard NEAR Connect injection API; real NEP-413 signatures and testnet transactions, no third-party wallet UI certification.",
      },
      null,
      2,
    ) + "\n",
  );
  }finally{if(riskMode&&cleanupId){
    const sub:any=await rpc.callFunction({contractId:config.contract,method:'get_subscription',args:{subscription_id:cleanupId}});
    if(sub?.active)await buyer.callFunction({contractId:config.contract,methodName:'cancel',args:{subscription_id:cleanupId},deposit:1n,gas:30000000000000n});
    if(cleanupKey&&(await rpc.viewAccessKeyList({accountId:buyer.accountId,finalityQuery:{finality:'final'}})).keys.some(k=>k.public_key===cleanupKey))await buyer.deleteKey(cleanupKey);
  }}
});

// Record the real acceptance journey when explicitly requested; never publish traces/cookies.
test.afterEach(async ({ page }, info) => {
  if (process.env.ACCORD_RECORD_DEMO === "1" && info.status === "passed") {
    const video = page.video();
    if (video) {
      await page.close();
      await video.saveAs(
        resolve(
          process.cwd(),
          process.env.ACCORD_SECURITY_DEMO === "1"
            ? "../docs/demo/security-native-wallet-raw.webm"
            : process.env.ACCORD_AGENT_UI === "1"
              ? process.env.ACCORD_REDESIGN === "1"
                ? process.env.ACCORD_EDITORIAL === "1"
                  ? "../docs/demo/editorial-wallet-demo.webm"
                  : "../docs/demo/redesign-wallet-demo.webm"
                : "../docs/demo/live-agent-wallet-demo.webm"
              : "../docs/demo/accord-testnet-demo.webm",
        ),
      );
    }
  }
});
