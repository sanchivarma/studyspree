import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  webServer: process.env.CI ? {
    command: "npm run dev -- --hostname localhost --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  } : undefined,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000", ...devices["Desktop Chrome"], reducedMotion: "reduce" },
  reporter: "list",
});
