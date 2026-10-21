import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { z } from "zod";

export async function createLocalAccount(page: Page, displayName: string, destination?: string) {
  const environment = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
  const raw = environment.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, "");
  if (!raw || !["localhost", "127.0.0.1"].includes(new URL(raw).hostname)) throw new Error("Local Supabase is required; external email is never requested.");
  const email = `profile-${randomUUID()}@example.test`;
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  const [delivery] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === "/login" && response.request().method() === "POST", { timeout: 30_000 }),
    page.getByRole("button", { name: "Email a sign-in link", exact: true }).click(),
  ]);
  expect(delivery.ok(), "Local sign-in request completed").toBe(true);
  await expect(page.getByTestId("auth-feedback").getByRole("status")).toHaveText("Check your email for your sign-in link.");
  const listing = z.object({ messages: z.array(z.object({ ID: z.string(), To: z.array(z.object({ Address: z.string() })) })) });
  let id: string | undefined;
  await expect.poll(async () => {
    const response = await page.request.get("http://127.0.0.1:55324/api/v1/messages");
    id = listing.parse(await response.json()).messages.find(message => message.To.some(to => to.Address === email))?.ID;
    return Boolean(id);
  }, { timeout: 15000 }).toBe(true);
  const response = await page.request.get(`http://127.0.0.1:55324/api/v1/message/${encodeURIComponent(id!)}`);
  const content = z.object({ HTML: z.string(), Text: z.string() }).parse(await response.json());
  const link = ((content.HTML + "\n" + content.Text).match(/https?:\/\/[^\s"<>]+/g) ?? [])
    .map(value => new URL(value.replaceAll("&amp;", "&"))).find(url => ["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "55321" && url.pathname === "/auth/v1/verify");
  if (!link) throw new Error("No local verification link in the local inbox.");
  // Complete the actual local email verification. Auth's configured callback is
  // port 3000; isolated production/verification servers use the same PKCE code
  // on their own origin. Browser routing cannot intercept a redirect chain.
  const verificationBase = new URL(page.url());
  if (!["localhost", "127.0.0.1"].includes(verificationBase.hostname)) throw new Error("Verification requires localhost");
  const verification = await page.request.get(link.href, { maxRedirects: 0 });
  expect(verification.status()).toBe(303);
  const callback = new URL(verification.headers().location);
  if (!["localhost", "127.0.0.1"].includes(callback.hostname) || callback.pathname !== "/auth/callback") throw new Error("Expected the local authentication callback");
  callback.host = verificationBase.host;
  await page.goto(callback.href);
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15000 });
  await page.getByLabel("Display name", { exact: true }).fill(displayName);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const [onboarding] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === "/onboarding" && response.request().method() === "POST", { timeout: 30_000 }),
    page.getByRole("button", { name: "Continue to StudySpree", exact: true }).click(),
  ]);
  expect(onboarding.ok(), "Local onboarding request completed").toBe(true);
  // The first authenticated Home/room can require a full development compile.
  if (destination) await expect(page).toHaveURL(new URL(destination, page.url()).href, { timeout: 60_000 });
  else await expect(page).toHaveURL(/\/$/, { timeout: 60_000 });
}
