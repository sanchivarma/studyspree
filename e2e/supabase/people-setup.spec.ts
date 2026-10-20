import { expect, test } from "@playwright/test";
import { createLocalAccount } from "./localAccount";

test("People can start privately before others arrive and share an invitation for a later join", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await page.route("**/api/rooms/token", route => route.fulfill({ status: 503, json: {} }));
  await createLocalAccount(page, "Private people host");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/study?mode=people");
  await page.getByRole("radio", { name: "Public", exact: true }).check();
  await page.getByRole("radio", { name: "Private", exact: true }).check();
  await page.getByLabel("Session title", { exact: true }).fill("Private study invitation");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  // Shared routes may need their first development compilation after Start.
  await expect(page).toHaveURL(/\/rooms\/[a-f0-9-]+$/, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
  const room = page.url();
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Study companions", exact: true });
  await drawer.getByRole("button", { name: /Invite people to this session/ }).click();
  await expect(drawer).toContainText("Link copied.");
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).pathname).toMatch(/^\/invite\/[a-f0-9]{64}$/);
  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  const context = await browser.newContext();
  await context.route("**/api/rooms/token", route => route.fulfill({ status: 503, json: {} }));
  try {
    const guest = await context.newPage(); await createLocalAccount(guest, "Invited people guest");
    await guest.goto(link);
    await guest.getByRole("button", { name: "Accept invitation", exact: true }).click();
    await expect(guest).toHaveURL(room);
    await expect(guest.locator('[data-repository-mode="server"]')).toBeVisible();
    const guestStart = guest.waitForResponse(response => response.url().endsWith("/api/repository") && response.request().postDataJSON()?.op === "start");
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    const guestSession = await guestStart;
    expect(guestSession.ok(), JSON.stringify(await guestSession.json())).toBe(true);
    await expect(guest.getByRole("button", { name: "Finish", exact: true })).toBeVisible({ timeout: 15_000 });
    await guest.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(guest.getByTestId("complete-screen")).toBeVisible({ timeout: 15_000 });
  } finally { await context.close(); }
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible({ timeout: 15_000 });
});
