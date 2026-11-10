import { test, expect } from "@playwright/test";
test("marketplace renders real terms without horizontal overflow", async ({
  page,
}) => {
  const base = process.env.ACCORD_LIVE_BROWSER
    ? "http://localhost:3000"
    : "http://localhost:3100";
  if (!process.env.ACCORD_LIVE_BROWSER) {
    for (const path of ["agent-types", "agent-examples"])
      await page.route(`**/api/near/${path}`, (r) => r.fulfill({ json: [] }));
    // Presentation fixture only. Financial behavior is tested separately against WASM/testnet.
    await page.route("**/api/near/config", (r) =>
      r.fulfill({
        json: {
          network: "testnet",
          contract: "accord.testnet",
          rpc: "http://unused.invalid",
          recipient: "localhost:3100",
        },
      }),
    );
    await page.route("**/api/near/services", (r) => r.fulfill({ json: [] }));
    await page.route("**/api/near/me", (r) =>
      r.fulfill({ status: 401, json: { error: "Sign in" } }),
    );
  }
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: /Delegate the work/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with NEAR" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("heading", { name: "My agreements" }),
  ).toBeVisible();
});

test("each agent listing opens its own input schema", async ({ page }) => {
  const templates = [
    {
      name: "Wallet Watch",
      kind: "near-wallet-watch-v1",
      input_label: "Wallet account and minimum reserve · JSON",
      input_example: {
        account_id: "demo.testnet",
        minimum_available_yocto: "50000000000000000000000",
      },
    },
    {
      name: "Access Guard",
      kind: "near-access-guard-v1",
      input_label: "Account and trusted contract · JSON",
      input_example: {
        account_id: "demo.testnet",
        trusted_contract_id: "accord.testnet",
      },
    },
    {
      name: "Contract Sentinel",
      kind: "near-contract-sentinel-v1",
      input_label: "Contract account and approved code hash · JSON",
      input_example: {
        account_id: "accord.testnet",
        expected_code_hash: "11111111111111111111111111111111",
      },
    },
    {
      name: "Receipt Inspector",
      kind: "near-receipt-inspector-v1",
      input_label: "Transaction hash and signer account · JSON",
      input_example: {
        signer_account_id: "demo.testnet",
        transaction_hash: "ANvufY2wASqigzqbHXRYuYj5YSXgycmMA6uQp4ti9Wap",
      },
    },
    {
      name: "Network Pulse",
      kind: "near-network-pulse-v1",
      input_label: "Maximum finalized-block age · JSON",
      input_example: { max_block_age_seconds: 60 },
    },
  ];
  // UI fixtures only; paid execution is separately verified by the real testnet demonstration.
  await page.route("**/api/near/config", (r) =>
    r.fulfill({
      json: {
        network: "testnet",
        contract: "accord.testnet",
        rpc: "http://unused.invalid",
        recipient: "localhost:3100",
      },
    }),
  );
  await page.route("**/api/near/agent-types", (r) =>
    r.fulfill({ json: templates }),
  );
  await page.route("**/api/near/agent-examples", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.route("**/api/near/services", (r) =>
    r.fulfill({
      json: templates.map((t, i) => ({
        id: String(i),
        metadata: { ...t, description: "Presentation test fixture" },
      })),
    }),
  );
  await page.route("**/api/near/me", (r) =>
    r.fulfill({ json: { accountId: "demo.testnet" } }),
  );
  await page.route("**/api/near/subscriptions", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/near/balances", (r) =>
    r.fulfill({ json: { available: "0", earned: "0", pending: "0" } }),
  );
  await page.route("http://unused.invalid/", (r) => {
    const args = JSON.parse(
      atob(r.request().postDataJSON().params.args_base64),
    );
    const t = templates[Number(args.service_id)]!;
    r.fulfill({
      json: {
        result: {
          result: Array.from(
            new TextEncoder().encode(
              JSON.stringify({
                name: t.name,
                provider: "provider.testnet",
                price: "1000000000000000000000",
                interval_ns: "60000000000",
                metadata_hash: "a".repeat(64),
              }),
            ),
          ),
        },
      },
    });
  });
  await page.goto("http://localhost:3100");
  for (const template of templates) {
    await page
      .locator("article.service")
      .filter({
        has: page.getByRole("heading", { name: template.name, exact: true }),
      })
      .getByRole("button", { name: "Choose terms →" })
      .click();
    const field = page.getByRole("textbox", {
      name: template.input_label,
      exact: true,
    });
    await expect(field).toBeVisible();
    expect(JSON.parse(await field.inputValue())).toEqual(
      template.input_example,
    );
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
});
