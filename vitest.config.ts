import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Leave memory available for Docker and Next during local verification.
  test: { environment: "node", include: ["src/**/*.test.ts"], maxWorkers: 2 },
});
