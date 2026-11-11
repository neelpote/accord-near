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
    page.getByRole("heading", { name: "Know what changed.", level: 1 }),
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
  const story = page.locator(".agent-story");
  const scrollToPhase = async (progress: number) => {
    const y = await story.evaluate((element, p) => {
      const stage = element.querySelector(".story-stage") as HTMLElement;
      return (
        scrollY +
        element.getBoundingClientRect().top -
        parseFloat(getComputedStyle(stage).top) +
        (element.clientHeight - stage.clientHeight) * p
      );
    }, progress);
    await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y);
  };
  await scrollToPhase(0.5);
  await expect(story).toHaveAttribute("data-chapter", "1");
  await expect(story.getByRole("heading", { name: /Evidence/ })).toBeVisible();
  expect(
    await story.evaluate((e) =>
      Number(getComputedStyle(e).getPropertyValue("--story-progress")),
    ),
  ).toBeGreaterThan(0.4);
  await scrollToPhase(0.85);
  await expect(story).toHaveAttribute("data-chapter", "2");
  await expect(
    story.getByRole("heading", { name: /Delegate work/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Observe", exact: false }).click();
  await expect(story).toHaveAttribute("data-chapter", "0");
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
  await page.getByRole("button", { name: "Inspect", exact: false }).click();
  await expect(story).toHaveAttribute("data-chapter", "1");
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
