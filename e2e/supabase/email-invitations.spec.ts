import { expect, test } from "@playwright/test";
import { createLocalAccount } from "./localAccount";
test("registered accounts can invite people without the preview sign-in message", async ({ page }) => {
  test.setTimeout(90000);
  await createLocalAccount(page, "Invitation sender");
  // Onboarding uses the configured site URL; cookies are shared across local ports.
  // Return to the isolated capture server before exercising delivery.
  await page.goto("/");
  expect(new URL(page.url()).origin).toBe(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000");
  await expect(page.getByText("Sign in with an account to join shared rooms.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Study spaces", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Invite by email", exact: true }).click();
  // This assertion prevents the test from sending through a real SMTP/API account.
  await expect(page.getByText("Local testing: invitations go to the local email inbox, not the recipient’s real inbox.", { exact: true })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(`registered-invite-${crypto.randomUUID()}@example.test`);
  const [delivery] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith("/api/invitations") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Send invitation", exact: true }).click(),
  ]);
  expect(delivery.ok()).toBe(true);
  await expect(page.getByTestId("email-invitation").getByRole("status")).toHaveText("Invitation captured in the local email inbox.");
});
