import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("preview People sends a real local invitation and its link opens registration", async ({ page, browser }) => {
  test.setTimeout(60000);
  await signIn(page);
  await expect(page.getByText("Sign in with an account to join shared rooms.", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Invite by email", exact: true }).click();
  await expect(page.getByText("Local testing: invitations go to the local email inbox, not the recipient’s real inbox.", { exact: true })).toBeVisible();
  const recipient = `invitation-${crypto.randomUUID()}@example.test`;
  await page.getByLabel("Email", { exact: true }).fill(recipient);
  const [delivery] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith("/api/invitations") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Send invitation", exact: true }).click(),
  ]);
  expect(delivery.ok()).toBe(true);
  await expect(page.getByTestId("email-invitation").getByRole("status")).toHaveText("Invitation captured in the local email inbox.");
  let messageId = "";
  await expect.poll(async () => {
    const response = await page.request.get("http://127.0.0.1:54324/api/v1/messages");
    const inbox = await response.json() as { messages: { ID: string; To: { Address: string }[] }[] };
    messageId = inbox.messages.find(message => message.To.some(to => to.Address === recipient))?.ID ?? "";
    return Boolean(messageId);
  }).toBe(true);
  const response = await page.request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`);
  const message = await response.json() as { Text: string; Subject: string };
  expect(message.Subject).toContain("ss_admin");
  expect(message.Text).toContain("/login?invite=1");
  const recipientContext = await browser.newContext();
  try {
    const recipientPage = await recipientContext.newPage();
    await recipientPage.goto(`${new URL(page.url()).origin}/login?invite=1`);
    await expect(recipientPage.getByRole("tab", { name: "Register", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(recipientPage.getByLabel("First name", { exact: true })).toBeVisible();
    expect((await recipientPage.request.post("/api/invitations", { data: { email: recipient, locale: "en", requestId: crypto.randomUUID() } })).status()).toBe(401);
  } finally { await recipientContext.close(); }
});

test("invitation labels resolve in every language and People stays actionable in preview", async ({ page }) => {
  test.setTimeout(60000);
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(page).toHaveURL(/\/invite$/);
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { invitations } = JSON.parse(readFileSync(new URL(`../src/translations/invitations/${locale}.json`, import.meta.url), "utf8")) as { invitations: { title: string; send: string } };
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.reload();
    await expect(page.getByRole("heading", { name: invitations.title, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: invitations.send, exact: true })).toBeVisible();
    expect(await page.getByTestId("email-invitation").innerText()).not.toMatch(/invitations\.\w+/);
  }
});
