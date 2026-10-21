import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/globalSetup.ts",
  testIgnore: ["**/supabase/**", "**/performance/**"], // Dedicated commands provide the database and production server.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  webServer: process.env.CI ? {
    // Isolate verification artifacts and use the stable Webpack development
    // server. Turbopack's memory-triggered restart interrupted privacy audits.
    command: "node node_modules/next/dist/bin/next dev --hostname localhost --port 3000",
    env: { STUDYSPREE_VERIFY: "1" },
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  } : undefined,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000", ...devices["Desktop Chrome"], reducedMotion: "reduce" },
  reporter: "list",
});
