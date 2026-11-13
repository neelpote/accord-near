import { test, expect } from "@playwright/test";
test("owner explicitly reviews execution identity and pauses jobs; receipt status is not overwritten", async ({
  page,
}) => {
  let approved = false,
    paused = false;
  const identity = {
    hash: "identity-fixture",
    agent_id: "near-wallet-watch-v1",
    provider_id: "provider.testnet",
    version: "1.0.0",
    endpoint: "http://127.0.0.1:4001",
    build_digest: "fixture-build",
  };
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
    if (path === "/me") json = { accountId: "buyer.testnet" };
    if (path === "/balances")
      json = { available: "0", earned: "0", pending: "0" };
    if (path === "/security")
      json = { decisions: [], reports: [], reviewer: false };
    if (path === "/pilot")
      json = { records: [], summary: { demand_validated: false } };
    if (path === "/subscriptions")
      json = [
        {
          id: "1",
          state: "ACTIVE",
          agreement: {
            service_id: "2",
            active: true,
            max_cycles: 2,
            cycles: 0,
            reserved: "200",
            next_due_ns: "0",
            expires_at_ns: String(BigInt(Date.now() + 1000000) * 1000000n),
          },
          cycles: [],
        },
      ];
    if (path === "/services/2/execution")
      json = {
        identity,
        spec_hash:"spec-fixture",
        enabled: true,
        limitations: "Advertised build identity, not attestation.",
      };
    if (path === "/execution/jobs")
      json = {
        jobs: [
          {
            id: "1",
            cycle: 0,
            payment_state: "PREPARED",
            receipt: null,
            approved_identity: approved ? "identity-fixture" : null,
            execution_paused: paused,
          },
        ],
        events: [],
      };
    if (path === "/subscriptions/1/execution") {
      const body = r.request().postDataJSON();
      if (body.approve) {
        expect(body.identity_hash).toBe(identity.hash);
        approved = true;
        paused = false;
      } else {
        expect(body.paused).toBe(true);
        paused = true;
      }
      json = { ok: true };
    }
    await r.fulfill({ json });
  });
  await page.goto("http://localhost:3100");
  const controls = page.getByRole("region", {
    name: "Execution authority for agreement 1",
  });
  await expect(
    controls.getByText(
      "New work paused until you approve this execution identity.",
    ),
  ).toBeVisible();
  await controls
    .getByRole("button", { name: "Approve this execution identity" })
    .click();
  await expect(
    controls.getByText("Execution identity approved", { exact: true }),
  ).toBeVisible();
  await controls.getByRole("button", { name: "Pause new work" }).click();
  await expect.poll(() => paused).toBe(true);
  await controls
    .getByText("Inspect outstanding jobs and security events")
    .click();
  await expect(controls.getByText(/No payment receipt recorded/)).toBeVisible();
});
