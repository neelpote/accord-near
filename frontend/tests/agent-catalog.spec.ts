import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
test("all five paid agent examples are listed with real outputs and source blocks", async ({
  page,
}) => {
  test.skip(
    process.env.ACCORD_AGENTS_SHOWCASE !== "1",
    "Requires the completed real five-agent demonstration",
  );
  const kinds = [
    "Wallet Watch",
    "Access Guard",
    "Contract Sentinel",
    "Receipt Inspector",
    "Network Pulse",
  ];
  await page.goto("http://localhost:3000");
  for (const name of kinds) {
    const card = page
      .locator("article.service")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.getByText("View paid example", { exact: true }).click();
    await expect(card.locator(".report-metrics")).toBeVisible();
    await expect(
      card.getByText(/Recorded testnet demonstration/),
    ).toBeVisible();
    await expect(card.getByText(/Artifact SHA-256:/)).toBeVisible();
    await expect(card.getByText(/testnet · block/)).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await card.screenshot({
      path: resolve(
        process.cwd(),
        "../docs/demo",
        name.toLowerCase().replaceAll(" ", "-") + ".png",
      ),
    });
    await card.getByText("View paid example", { exact: true }).click();
  }
  await mkdir(resolve(process.cwd(), "../docs/demo"), { recursive: true });
  await page
    .locator("#market")
    .screenshot({
      path: resolve(process.cwd(), "../docs/demo/five-agent-catalog.png"),
    });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test.afterEach(async ({ page }, info) => {
  if (process.env.ACCORD_RECORD_DEMO === "1" && info.status === "passed") {
    const video = page.video();
    if (video) {
      await page.close();
      await video.saveAs(
        resolve(process.cwd(), "../docs/demo/five-agents-showcase.webm"),
      );
    }
  }
});
