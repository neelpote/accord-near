import { test, expect } from "@playwright/test";
test("security queue exposes exact-payment approval and never offers block override", async ({
  page,
}) => {
  const decisions = ["warn", "block"].map((verdict, i) => ({
    id: String(i),
    state: verdict === "warn" ? "pending" : "block",
    expires_at: new Date(Date.now() + 300000).toISOString(),
    body: {
      verdict,
      intent_hash: "intent-fixture",
      evidence_hash: "evidence-fixture",
      intent: {
        receiver: "provider.testnet",
        contract: "escrow.testnet",
        amount: "1000",
        args: { subscription_id: "42", cycle: 0 },
      },
      reasons: [
        {
          code: verdict === "warn" ? "NEW_ACCOUNT" : "VERIFIED_BLOCKLIST",
          message: "Controlled browser fixture",
        },
      ],
      evidence: {},
    },
  }));
  let approved = false;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/near/**", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/api/near")[1];
    let json: any = [];
    if (path === "/config")
      json = {
        network: "testnet",
        contract: "escrow.testnet",
        rpc: "http://unused.invalid",
        recipient: "localhost:3100",
      };
    if (path === "/me") json = { accountId: "owner.testnet" };
    if (path === "/balances")
      json = { available: "0", earned: "0", pending: "0" };
    if (path === "/pilot")
      json = { records: [], summary: { demand_validated: false } };
    if (path === "/security")
      json = { decisions, reports: [], reviewer: false };
    if (path === "/security/decisions/0") {
      expect(r.request().postDataJSON()).toEqual({
        approve: true,
        intent_hash: "intent-fixture",
        evidence_hash: "evidence-fixture",
      });
      approved = true;
      decisions[0]!.state = "approved";
      json = { state: "approved" };
    }
    await r.fulfill({ json });
  });
  await page.goto("http://localhost:3100");
  const security = page.locator("#security");
  await expect(
    security.getByRole("heading", { name: "Payment security", exact: true }),
  ).toBeVisible();
  await expect(
    security.getByRole("button", { name: "Approve this exact payment once" }),
  ).toHaveCount(1);
  await security
    .getByRole("button", { name: "Approve this exact payment once" })
    .click();
  await expect.poll(() => approved).toBe(true);
  await expect(
    security.getByRole("heading", { name: "WARN · approved" }),
  ).toBeVisible();
  await expect(
    security.getByRole("button", { name: "Approve this exact payment once" }),
  ).toHaveCount(0);
  await expect(
    security.getByRole("heading", { name: "BLOCK · block" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
