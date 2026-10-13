import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { signIn, freezeClock, seedCompletion, settleClock } from "./sessionFixtures";

test("completion shows calm totals and both navigation destinations", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await signIn(page);
  await seedCompletion(page);
  await page.goto("/session/complete-test/complete");
  await expect(page.getByRole("heading", { name: "Solid session.", exact: true })).toBeVisible();
  await expect(page.getByTestId("all-time-hours")).toHaveText("42.5");
  await expect(page.getByText("hours, all time", { exact: true })).toBeVisible();
  await expect(page.getByText("+25m this session · 1h 10m today", { exact: true })).toBeVisible();
  await expect(page.getByText(/day streak/)).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByTestId("auth-feedback")).toHaveCount(0);
  const start = page.getByRole("link", { name: "Start another", exact: true });
  await expect(start).toHaveAttribute("href", "/study");
  await start.click();
  await expect(page).toHaveURL(/\/study$/);
  await page.goto("/session/complete-test/complete");
  await page.getByRole("link", { name: "Done for now", exact: true }).click();
  await expect(page).toHaveURL(/\/stats$/);
  expect(pageErrors).toEqual([]);
});

test("total counts up over 1200ms with ease-out and pauses while the tab is hidden", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page);
  await freezeClock(page);
  await seedCompletion(page);
  await page.goto("/session/complete-test/complete");
  await settleClock(page, "all-time-hours");
  const total = page.getByTestId("all-time-hours");
  await expect(total).toHaveText("42.1");
  await page.clock.runFor(600);
  await expect(total).toHaveText("42.4");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(2000);
  await expect(total).toHaveText("42.4");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(600);
  await expect(total).toHaveText("42.5");
});

test("completion fits a phone, uses translated copy, and avoids forbidden wording", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await signIn(page);
  await seedCompletion(page);
  const forbidden = /\b(?:fail(?:ed|ure)?|quit|give up|gave up|abandon(?:ed)?|only|short|incomplete|missed|lost streak|broken streak|behind|lazy|finally|at last|again|we missed you|where have you been|you planned|you only|yesterday)\b|%/i;
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { complete } = JSON.parse(readFileSync(new URL(`../src/translations/complete/${locale}.json`, import.meta.url), "utf8")) as { complete: { affirmation: string; allTime: string; summary: string; startAnother: string; done: string } };
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto("/session/complete-test/complete");
    await expect(page.getByRole("heading", { name: complete.affirmation, exact: true })).toBeVisible();
    await expect(page.getByTestId("all-time-hours")).toHaveText(new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).format(42.5));
    const { stats } = JSON.parse(readFileSync(new URL(`../src/translations/stats/${locale}.json`, import.meta.url), "utf8")) as { stats: { durationMinutes: string; durationHoursMinutes: string } };
    await expect(page.getByTestId("banked-summary")).toHaveText(complete.summary.replace("{sessionDuration}", stats.durationMinutes.replace("{minutes}", "25")).replace("{todayDuration}", stats.durationHoursMinutes.replace("{hours}", "1").replace("{minutes}", "10")));
    await expect(page.getByRole("link", { name: complete.startAnother, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: complete.done, exact: true })).toBeVisible();
    expect(await page.getByTestId("complete-screen").innerText()).not.toMatch(forbidden);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (locale === "en") await page.screenshot({ path: "test-results/complete-mobile.png" });
  }
});
