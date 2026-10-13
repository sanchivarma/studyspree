import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000", ...devices["Desktop Chrome"], reducedMotion: "reduce" },
  reporter: "list",
});
