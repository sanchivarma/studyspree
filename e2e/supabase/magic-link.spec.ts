import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";

test("local email magic link signs in and onboarding has exactly three steps", async ({ page }) => {
  test.setTimeout(90000);
  const environment = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
  const raw = environment.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, "");
  if (!raw || !["localhost", "127.0.0.1"].includes(new URL(raw).hostname)) throw new Error("This integration test requires the local Supabase stack; no external email will be requested.");
  const email = `studyspree-${randomUUID()}@example.test`;
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email a sign-in link", exact: true }).click();
  await expect(page.getByTestId("auth-feedback").getByRole("status")).toHaveText("Check your email for your sign-in link.");

  const listing = z.object({ messages: z.array(z.object({ ID: z.string(), To: z.array(z.object({ Address: z.string() })) })) });
  let messageId: string | undefined;
  await expect.poll(async () => {
    const response = await page.request.get("http://127.0.0.1:55324/api/v1/messages");
    const data = listing.parse(await response.json());
    messageId = data.messages.find(message => message.To.some(recipient => recipient.Address === email))?.ID;
    return Boolean(messageId);
  }, { timeout: 15000 }).toBe(true);
  const response = await page.request.get(`http://127.0.0.1:55324/api/v1/message/${encodeURIComponent(messageId!)}`);
  const content = z.object({ HTML: z.string(), Text: z.string() }).parse(await response.json());
  const candidates = (content.HTML + "\n" + content.Text).match(/https?:\/\/[^\s"<>]+/g) ?? [];
  const magicLink = candidates.map(value => new URL(value.replaceAll("&amp;", "&"))).find(url => ["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "55321" && url.pathname === "/auth/v1/verify");
  if (!magicLink) throw new Error("The local inbox did not contain a local authentication link.");
  await page.goto(magicLink.href);
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15000 });
  await expect(page.getByText("Step 1 of 3", { exact: true })).toBeVisible();
  await page.getByLabel("Display name", { exact: true }).fill("Local Study Test");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Step 2 of 3", { exact: true })).toBeVisible();
  await page.getByTestId("theme-card-night-shift").click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Step 3 of 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue to StudySpree", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Local Study Test");
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Local Study Test");
  expect((await page.context().cookies()).some(cookie => cookie.name === "ss_dev_admin")).toBe(false);
});
