import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";

test("registration checks usernames and sends a welcome confirmation that opens onboarding", async ({ page, browser }) => {
  test.setTimeout(90000);
  const environment = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
  const raw = environment.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, "");
  if (!raw || !["localhost", "127.0.0.1"].includes(new URL(raw).hostname)) throw new Error("Registration integration requires local Supabase and local email capture.");
  const username = `register_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const email = `${username}@example.test`;
  await page.goto("/register");
  await page.getByLabel("First name", { exact: true }).fill("Alex");
  await page.getByLabel("Last name", { exact: true }).fill("Sample");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Username", { exact: true }).fill(username.toUpperCase());
  await page.getByLabel("Password", { exact: true }).fill("Registration-test-42!");
  await page.getByLabel("Confirm password", { exact: true }).fill("Registration-test-42!");
  await page.getByLabel("I confirm that I am 18 years old or older.", { exact: true }).check();
  const creation = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/register" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  expect((await creation).status()).toBe(200);
  await expect(page.getByRole("dialog", { name: "Registration successful" })).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue("");
  const listing = z.object({ messages: z.array(z.object({ ID: z.string(), To: z.array(z.object({ Address: z.string() })) })) });
  let messageId = "";
  await expect.poll(async () => {
    const response = await page.request.get("http://127.0.0.1:55324/api/v1/messages");
    messageId = listing.parse(await response.json()).messages.find(message => message.To.some(to => to.Address === email))?.ID ?? "";
    return Boolean(messageId);
  }, { timeout: 15000 }).toBe(true);
  const response = await page.request.get(`http://127.0.0.1:55324/api/v1/message/${encodeURIComponent(messageId)}`);
  const message = z.object({ HTML: z.string(), Subject: z.string() }).parse(await response.json());
  expect(message.Subject).toContain("Welcome to the StudySpree family");
  expect(message.HTML).toContain("Welcome to the StudySpree family");
  expect(message.HTML).toContain(username);
  expect(message.HTML).toContain(email);
  expect(message.HTML).toContain("Alex Sample");
  expect(message.HTML).toContain("/login");
  expect(message.HTML).not.toContain("Registration-test-42!");
  const links = message.HTML.match(/https?:\/\/[^\s"<>]+/g) ?? [];
  const confirmation = links.map(link => new URL(link.replaceAll("&amp;", "&"))).find(link => ["localhost", "127.0.0.1"].includes(link.hostname) && link.pathname === "/auth/confirm");
  expect(confirmation).toBeDefined();
  await page.getByLabel("First name", { exact: true }).fill("Alex");
  await page.getByLabel("Last name", { exact: true }).fill("Sample");
  await page.getByLabel("Email", { exact: true }).fill(`other-${email}`);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill("Registration-test-42!");
  await page.getByLabel("Confirm password", { exact: true }).fill("Registration-test-42!");
  await page.getByLabel("I confirm that I am 18 years old or older.", { exact: true }).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("This username is taken. Choose another username.", { exact: true })).toBeVisible();
  const context = await browser.newContext();
  try {
    const otherBrowser = await context.newPage();
    // Local verification may use an isolated port or IPv4 loopback hostname.
    // Preserve the actual token and path while targeting that same test server.
    const target = new URL(confirmation!.href);
    target.host = new URL(page.url()).host;
    await otherBrowser.goto(target.href);
    await expect(otherBrowser).toHaveURL(/\/onboarding$/);
  } finally { await context.close(); }
});
