import { test, expect } from "@playwright/test";
test("marketplace renders real terms without horizontal overflow", async ({
  page,
}) => {
  const base = process.env.ACCORD_LIVE_BROWSER
    ? "http://localhost:3000"
    : "http://localhost:3100";
  if (!process.env.ACCORD_LIVE_BROWSER) {
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
