import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { z } from "zod";

export async function createLocalAccount(page: Page, displayName: string) {
  const environment = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
  const raw = environment.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, "");
  if (!raw || !["localhost", "127.0.0.1"].includes(new URL(raw).hostname)) throw new Error("Local Supabase is required; external email is never requested.");
  const email = `profile-${randomUUID()}@example.test`;
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email a sign-in link", exact: true }).click();
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
  // Isolated verification servers keep the configured local email callback;
  // redirect its browser navigation onto the chosen local test port.
  const verificationBase=process.env.PLAYWRIGHT_BASE_URL;
  if(verificationBase&&new URL(verificationBase).origin!=="http://localhost:3000"){
    if(!["localhost","127.0.0.1"].includes(new URL(verificationBase).hostname))throw new Error("Verification requires localhost");
    await page.route("http://localhost:3000/**",async route=>{
      if(!route.request().isNavigationRequest()){await route.continue();return;}
      const target=new URL(route.request().url());const base=new URL(verificationBase);target.host=base.host;
      await route.fulfill({status:302,headers:{location:target.href}});
    });
  }
  await page.goto(link.href);
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15000 });
  await page.getByLabel("Display name", { exact: true }).fill(displayName);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to StudySpree", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
}
