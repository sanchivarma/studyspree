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
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email to confirm your account.");
  const listing = z.object({ messages: z.array(z.object({ ID: z.string(), To: z.array(z.object({ Address: z.string() })) })) });
  let messageId = "";
  await expect.poll(async () => {
    const response = await page.request.get("http://127.0.0.1:55324/api/v1/messages");
    messageId = listing.parse(await response.json()).messages.find(message => message.To.some(to => to.Address === email))?.ID ?? "";
    return Boolean(messageId);
  }, { timeout: 15000 }).toBe(true);
  const response = await page.request.get(`http://127.0.0.1:55324/api/v1/message/${encodeURIComponent(messageId)}`);
  const message = z.object({ HTML: z.string(), Subject: z.string() }).parse(await response.json());
  expect(message.Subject).toContain("Welcome to StudySpree");
  expect(message.HTML).toContain("Welcome to StudySpree!");
  const links = message.HTML.match(/https?:\/\/[^\s"<>]+/g) ?? [];
  const confirmation = links.map(link => new URL(link.replaceAll("&amp;", "&"))).find(link => ["localhost", "127.0.0.1"].includes(link.hostname) && link.pathname === "/auth/confirm");
  expect(confirmation).toBeDefined();
  await page.getByLabel("Email", { exact: true }).fill(`other-${email}`);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("This username is taken. Choose another username.", { exact: true })).toBeVisible();
  const context = await browser.newContext();
  try {
    const otherBrowser = await context.newPage();
    await otherBrowser.goto(confirmation!.href);
    await expect(otherBrowser).toHaveURL(/\/onboarding$/);
  } finally { await context.close(); }
});
