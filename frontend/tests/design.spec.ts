import { test, expect } from "@playwright/test";
async function mockAPI(page: import("@playwright/test").Page) {
  await page.route("**/api/near/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    return r.fulfill({
      status: path.endsWith("/me") ? 401 : 200,
      json: path.endsWith("/config")
        ? {
            network: "testnet",
            contract: "accord.testnet",
            rpc: "http://unused.invalid",
            recipient: "localhost:3100",
          }
        : path.endsWith("/me")
          ? { error: "Sign in" }
          : [],
    });
  });
}
test("agent scene, role controls and motion preferences remain usable on mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockAPI(page);
  await page.goto("http://localhost:3100");
  await expect(
    page.getByRole("heading", { name: "Your agents. Your rules." }),
  ).toBeVisible();
  await expect(
    page.locator(
      '.agent-scene[data-scene-state="ready"],.agent-scene[data-scene-state="fallback"]',
    ),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Permissions", exact: true }).click();
  await expect(
    page.locator(".lab-agent").getByRole("heading", { name: "Access Guard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Permissions", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Pause animations" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await page.getByRole("button", { name: "Resume animations" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "running");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Reduced motion" }),
  ).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  expect(errors).toEqual([]);
});
test("WebGL-unavailable devices keep the illustration and app navigation", async ({
  page,
}) => {
  await mockAPI(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return (original as Function).call(this, type, ...args);
    } as typeof original;
  });
  await page.goto("http://localhost:3100");
  await expect(
    page.locator('.agent-scene[data-scene-state="fallback"]'),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("link", { name: "Open workspace" }),
  ).toHaveAttribute("href", "#operations");
  await expect(
    page.getByRole("button", { name: "Sign in with NEAR" }),
  ).toBeVisible();
});
