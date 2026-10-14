import { expect, test } from "@playwright/test";
import { freezeClock, signIn, startSession, settleClock } from "./sessionFixtures";

test("three seconds of a 25-minute session are banked with affirming copy", async ({ page }) => {
  await signIn(page); await freezeClock(page);
  await startSession(page, undefined, 25);
  await page.clock.runFor(3000);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await settleClock(page, "complete-screen");
  await expect(page.getByRole("heading", { name: "You started. That was the hard part.", exact: true })).toBeVisible();
  await expect(page.getByTestId("banked-summary")).toHaveText("+3s this session · 0h 0m today");
  expect(await page.getByTestId("complete-screen").innerText()).not.toMatch(/\b(?:fail|quit|gave up|only|short|incomplete|abandoned|missed)\b/i);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].actualSeconds)).toBe(3);
});

test("expired completion summaries return through root", async ({ page }) => {
  await signIn(page); await freezeClock(page);
  const path = await startSession(page);
  await page.clock.runFor(3000);
  await page.keyboard.press("Escape");
  await settleClock(page, "complete-screen");
  await page.clock.runFor(600_000);
  await expect.poll(async () => { await page.clock.runFor(100); return new URL(page.url()).pathname; }).toBe("/home");
  await page.goto(`${path}/complete`);
  await page.clock.runFor(100);
  await expect.poll(async () => { await page.clock.runFor(100); return new URL(page.url()).pathname; }).toBe("/home");
});
