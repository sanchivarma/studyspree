import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./sessionFixtures";

const today = "2026-10-14";
async function seed(page: Page, lastDate: string | null, current = 4, showStreak = true, marker: string | null = today) {
  await page.clock.setFixedTime(new Date(`${today}T12:00:00Z`));
  await page.evaluate(({ lastDate, current, showStreak, marker }) => {
    localStorage.setItem("ss_profile", JSON.stringify({ displayName: "Alex", selectedCharacter: "balcony-dusk", timezone: "UTC", showStreak, reduceMotion: true, webcamEnabled: false, ambienceEnabled: false, comebackShownForDate: marker }));
    localStorage.setItem("ss_sessions", JSON.stringify(lastDate ? [{ id: "prior", startedAt: `${lastDate}T10:00:00.000Z`, endedAt: `${lastDate}T11:00:00.000Z`, localDate: lastDate, actualSeconds: 3600, plannedMinutes: 50, endedReason: "completed", characterSlug: "rain-desk", task: null }] : []));
    localStorage.setItem("ss_streak", JSON.stringify({ current: lastDate ? current : 0, best: 12, lastActiveDate: lastDate, freezesRemaining: 2, freezesResetAt: "2026-11-01" }));
    localStorage.setItem("ss_active", "null"); localStorage.setItem("ss_streak_events", "{}");
  }, { lastDate, current, showStreak, marker });
}

test.beforeEach(async ({ page }) => { await signIn(page); });

for (const scenario of [
  { name: "first activity", date: null, text: "Day 1", freeze: false, show: true },
  { name: "consecutive activity", date: "2026-10-13", text: "5 day streak", freeze: false, show: true },
  { name: "same-day activity", date: today, text: null, freeze: false, show: true },
  { name: "freeze activity", date: "2026-10-12", text: "5 day streak", freeze: true, show: true },
  { name: "fresh Day 1", date: "2026-10-09", text: "Day 1", freeze: false, show: true },
  { name: "hidden streak", date: "2026-10-12", text: null, freeze: false, show: false },
]) {
  test(`completion: ${scenario.name} survives refresh`, async ({ page }) => {
    await seed(page, scenario.date, 4, scenario.show);
    await page.goto("/study");
    await page.getByRole("button", { name: "25 min", exact: true }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
    await page.clock.setFixedTime(new Date(`${today}T12:00:03Z`));
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    for (const refresh of [false, true]) {
      if (refresh) await page.reload();
      await expect(page.getByTestId("complete-screen")).toBeVisible({ timeout: 15000 });
      if (scenario.text) await expect(page.getByTestId("completion-streak")).toContainText(scenario.text);
      else await expect(page.getByTestId("completion-streak")).toHaveCount(0);
      if (scenario.freeze) await expect(page.getByTestId("freeze-notice")).toHaveText("We used a streak freeze. Your streak is safe.");
      else await expect(page.getByTestId("freeze-notice")).toHaveCount(0);
      expect(await page.getByTestId("complete-screen").innerText()).not.toMatch(/\b(fail|quit|gave up|only|short|incomplete|abandoned|missed|broken|lost)\b/i);
    }
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_streak")!).best)).toBe(12);
    if (scenario.freeze) expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_streak")!).freezesRemaining)).toBe(1);
  });
}

test("comeback is welcoming, keeps banked hours, and dismisses for the day", async ({ page }) => {
  const debug: string[] = [];
  page.on("console", message => { if (message.type() === "debug") debug.push(message.text()); });
  await seed(page, "2026-10-10", 4, true, null);
  await page.goto("/study");
  const screen = page.getByTestId("comeback-screen");
  await expect(screen).toBeVisible({ timeout: 15000 });
  await expect(screen).toContainText("Welcome back, Alex.");
  await expect(screen).toContainText("1 hours. Still yours.");
  await expect(screen).toContainText("Let's do five minutes.");
  expect(await screen.innerText()).not.toMatch(/\b(finally|at last|missed|again|lost|absence|days)\b/i);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).comebackShownForDate)).toBe(today);
  await page.getByRole("button", { name: "Not right now", exact: true }).click();
  await expect(screen).toHaveCount(0);
  await expect(page.getByRole("button", { name: "25 min", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "25 min", exact: true })).toBeVisible();
  await expect(screen).toHaveCount(0);
  expect(debug.filter(text => text.startsWith("comeback_shown"))).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].actualSeconds)).toBe(3600);
});

test("comeback Start creates five minutes with the chosen character and records conversion", async ({ page }) => {
  const debug: string[] = [];
  page.on("console", message => { if (message.type() === "debug") debug.push(message.text()); });
  await seed(page, "2026-10-11", 4, true, null);
  await page.goto("/study");
  await expect(page.getByTestId("comeback-screen")).toBeVisible({ timeout: 15000 });
  await page.locator("body").click({ position: { x: 250, y: 120 } });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).find((session: { endedAt: string | null }) => session.endedAt === null));
  expect(active).toMatchObject({ plannedMinutes: 5, characterSlug: "balcony-dusk", task: null });
  expect(debug.some(text => text.startsWith("comeback_converted") && text.includes("3"))).toBe(true);
});

test("new and recently active users get the normal Study screen", async ({ page }) => {
  for (const date of [null, "2026-10-12"]) {
    await seed(page, date, 4, true, null);
    await page.goto("/study");
    await expect(page.getByRole("button", { name: "25 min", exact: true })).toBeVisible();
    await expect(page.getByTestId("comeback-screen")).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).comebackShownForDate)).toBeNull();
  }
});

test("comeback uses the profile calendar date and does not repeat on refresh", async ({ page }) => {
  await seed(page, "2026-10-12", 4, true, null);
  await page.clock.setFixedTime(new Date("2026-10-14T23:00:00Z"));
  await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem("ss_profile")!);
    localStorage.setItem("ss_profile", JSON.stringify({ ...profile, timezone: "Europe/Berlin" }));
  });
  await page.goto("/study");
  await expect(page.getByTestId("comeback-screen")).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).comebackShownForDate)).toBe("2026-10-15");
  await page.reload();
  await expect(page.getByRole("button", { name: "25 min", exact: true })).toBeVisible();
  await expect(page.getByTestId("comeback-screen")).toHaveCount(0);
});

test("comeback fits a phone and translates every line into all five languages", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    await seed(page, "2026-10-10", 4, true, null);
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto("/study");
    const screen = page.getByTestId("comeback-screen");
    const { comeback } = JSON.parse(readFileSync(new URL(`../src/translations/comeback/${locale}.json`, import.meta.url), "utf8")) as { comeback: Record<string, string> };
    await expect(screen).toBeVisible({ timeout: 15000 });
    for (const key of ["welcome", "hours", "suggestion", "notNow"]) {
      await expect(screen).toContainText(comeback[key].replace("{name}", "Alex").replace("{count}", "1"));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (locale === "en") await page.screenshot({ path: "test-results/comeback-mobile.png" });
  }
});
