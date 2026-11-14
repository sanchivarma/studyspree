import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectFastAction } from "./performance/budget";

// Run against an optimized local build with the real local Supabase stack.
// Never substitute mocked responses for these latency checks.
const source = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const value = (key: string) => source.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
const credentials = { username: value("DEV_ADMIN_USERNAME"), password: value("DEV_ADMIN_PASSWORD") };

test("real auth APIs complete within one second", async ({ request }, info) => {
  expect(credentials.username).not.toBe("");
  expect(credentials.password).not.toBe("");
  for (let round = 1; round <= 3; round++) {
    for (const [path, data, status] of [
      ["username", { username: "availability_probe_84" }, 200],
      ["username", { username: credentials.username }, 422],
      ["login", credentials, 200],
      ["logout", {}, 200],
    ] as const) {
      await expectFastAction(info, `${path} round ${round} status ${status}`, async remaining => {
        const response = await request.post(`/api/auth/${path}`, { data, timeout: remaining() });
        expect(response.status()).toBe(status);
        await response.json();
      }, async () => {});
    }
  }
});

test("login and sign-out clicks reach their screens within one second", async ({ page }, info) => {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(credentials.username);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await expectFastAction(info, "Sign in through ready dashboard", remaining => page.getByRole("button", { name: "Sign in", exact: true }).click({ timeout: remaining() }), async remaining => {
    await expect(page.getByTestId("default-study-room")).toBeVisible({ timeout: remaining() });
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible({ timeout: remaining() });
  });
  await expectFastAction(info, "Sign out through ready login form", remaining => page.getByRole("button", { name: "Sign out", exact: true }).click({ timeout: remaining() }), async remaining => {
    await expect(page).toHaveURL(/\/login$/, { timeout: remaining() });
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled({ timeout: remaining() });
  });
});

test("Create account reports a real taken username within one second", async ({ page }, info) => {
  await page.goto("/register");
  for (const [label, input] of [["First name", "Alex"], ["Last name", "Sample"], ["Email", "alex@example.test"], ["Username", credentials.username], ["Password", "Registration-test-42!"], ["Confirm password", "Registration-test-42!"]]) {
    await page.getByLabel(label, { exact: true }).fill(input);
  }
  await page.getByLabel("I confirm that I am 18 years old or older.", { exact: true }).check();
  await expectFastAction(info, "Create account through taken username warning", remaining => page.getByRole("button", { name: "Create account", exact: true }).click({ timeout: remaining() }), async remaining => {
    await expect(page.getByRole("alert").filter({ hasText: "This username is taken. Choose another username." })).toBeVisible({ timeout: remaining() });
  });
});

test("idle dashboard does not repeat community or repository reads", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", { data: credentials });
  expect(login.status()).toBe(200);
  await page.goto("/");
  await expect(page.getByTestId("default-study-room")).toBeVisible();
  await expect(page.getByTestId("dashboard-rooms").getByRole("status")).toHaveCount(0);
  // Let the initial parallel dashboard/profile queries settle before observing
  // more than two former five-second polling cycles.
  await page.waitForLoadState("networkidle");
  const repeated: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/community" || path === "/api/repository") repeated.push(path);
  });
  await page.waitForTimeout(12000);
  expect(repeated).toEqual([]);
});
