import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 360000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    // CI runners have no reliable GPU. Exercise the explicit static fallback there;
    // the real WebGL scene is checked locally and in the recorded browser evidence.
    launchOptions: process.env.CI ? {args:["--disable-webgl"]} : {},
    viewport: { width: 1440, height: 1100 },
    screenshot: "only-on-failure",
    video: process.env.ACCORD_RECORD_DEMO === "1" ? "on" : "off",
    trace: "retain-on-failure",
  },
  webServer: process.env.ACCORD_LIVE_BROWSER
    ? undefined
    : {
        command: "npm run dev -- --port 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
      },
});
