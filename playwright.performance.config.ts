import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PERFORMANCE_BASE_URL ?? "http://localhost:3002";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
  throw new Error("Performance tests require a local production server and local Supabase.");
}

export default defineConfig({
  testDir: "./e2e/performance",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 120_000, // Account setup is outside the fixed click budget.
  // Continuous trace screenshots compete with video compositing and distort
  // frame-delivery measurements. Retain DOM/network traces and a failure image.
  use: { ...devices["Desktop Chrome"], baseURL, reducedMotion: "reduce", trace: { mode: "retain-on-failure", screenshots: false }, screenshot: "only-on-failure" },
  reporter: [["list"], ["json", { outputFile: "test-results/performance.json" }]],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname localhost --port ${new URL(baseURL).port || "3002"}`,
    url: `${baseURL}/login`,
    env: { SITE_URL: baseURL, INVITATION_EMAIL_TRANSPORT: "mailpit" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
