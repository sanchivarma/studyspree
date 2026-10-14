import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

test("development seed tools require a signed-in profile", async ({ page }) => {
  await page.goto("/dev");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("tab", { name: "Login", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Seed 40 hours", exact: true })).toHaveCount(0);
});

async function prepare(page: Page, seed = true) {
  await page.clock.setFixedTime(new Date("2026-10-14T12:00:00Z"));
  await signIn(page);
  if (seed) {
    await page.goto("/dev");
    await page.getByRole("button", { name: "Seed 40 hours", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Sample history is ready.");
    await page.getByRole("link", { name: "View stats", exact: true }).click();
  } else await page.goto("/stats");
  await expect(page.getByTestId("stats-total")).toBeVisible({ timeout: 15000 });
}

test("empty stats show real zero totals and Ready when you are", async ({ page }) => {
  await prepare(page, false);
  await expect(page.getByTestId("stats-total")).toHaveText("0.0");
  await expect(page.getByTestId("stats-session-count")).toHaveText("across 0 sessions");
  await expect(page.getByTestId("session-history").locator("tbody tr")).toHaveCount(0);
  await expect(page.getByTestId("streak-current")).toHaveText("Ready when you are");
  expect(await page.getByTestId("streak-card").innerText()).not.toMatch(/0 days|Streak lost/i);
  await expect(page.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
});

test("dev seed fills real stats once, preserves totals, and loads history in pages of twenty", async ({ page }) => {
  test.setTimeout(60000);
  await prepare(page);
  await expect(page.getByTestId("stats-total")).toHaveText("40.0");
  await expect(page.getByTestId("heatmap-grid").locator("button")).toHaveCount(371);
  await expect(page.getByTestId("heatmap-grid").locator("button:not(:disabled)")).toHaveCount(365);
  await expect(page.getByTestId("recent-bars").getByRole("img")).toHaveCount(14);
  const rows = page.getByTestId("session-history").locator("tbody tr");
  await expect(rows).toHaveCount(20);
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).length);
  await expect(page.getByTestId("stats-session-count")).toHaveText(`across ${count} sessions`);
  await expect(page.getByTestId("streak-current")).toHaveText("6 days");
  for (let loaded = 20; loaded < count; loaded += 20) {
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect(rows).toHaveCount(Math.min(loaded + 20, count));
  }
  await expect(page.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
  expect(await rows.evaluateAll((elements) => new Set(elements.map((element) => element.getAttribute("data-session-id"))).size)).toBe(count);
  const stored = await page.evaluate(() => localStorage.getItem("ss_sessions"));
  await page.goto("/dev");
  await page.getByRole("button", { name: "Seed 40 hours", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Sample history is ready.");
  expect(await page.evaluate(() => localStorage.getItem("ss_sessions"))).toBe(stored);
  await page.goto("/stats");
  await expect(page.getByTestId("stats-total")).toHaveText("40.0");
  await page.reload();
  await expect(page.getByTestId("stats-total")).toHaveText("40.0");
  await expect(rows).toHaveCount(20);
  await page.screenshot({ path: "test-results/stats-desktop.png", fullPage: true });
});

test("heatmap uses neutral gap cells, meaningful tooltips and safe arrow-key movement", async ({ page }) => {
  await prepare(page);
  const grid = page.getByTestId("heatmap-grid");
  const zero = grid.locator('[data-date="2026-09-20"]');
  await expect(zero).toHaveAttribute("data-level", "0");
  await expect(zero).toHaveCSS("border-top-width", "0px");
  expect(await zero.evaluate((cell) => (cell as HTMLElement).style.backgroundColor)).toBe("var(--grey-zero)");
  expect(await zero.boundingBox()).toMatchObject({ width: 11, height: 11 });
  await expect(zero).toHaveCSS("border-radius", "2px");
  await zero.hover();
  await expect(page.getByRole("tooltip")).toHaveText("No sessions on 20 September");
  const active = grid.locator('[data-date="2026-10-12"]');
  await active.hover();
  await expect(page.getByRole("tooltip")).toContainText("on 12 October");
  const latest = grid.locator('[data-date="2026-10-14"]');
  await latest.focus(); await page.keyboard.press("ArrowLeft");
  await expect(grid.locator('[data-date="2026-10-07"]')).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(grid.locator('[data-date="2026-10-06"]')).toBeFocused();
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight");
  await expect(latest).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(latest).toBeFocused();
  const future = grid.locator('[data-date="2026-10-15"]');
  await expect(future).toBeDisabled(); await expect(future).toHaveCSS("opacity", "0.03");
  await expect(future).toHaveCSS("pointer-events", "none");
  await page.keyboard.press("Control+Home");
  await expect(grid.locator('[data-date="2025-10-15"]')).toBeFocused();
  await page.keyboard.press("Control+End"); await expect(latest).toBeFocused();
  await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
});

test("mobile heatmap starts at the right edge without overflowing the page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 }); await prepare(page);
  const scroller = page.getByTestId("heatmap-scroll");
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft > 0 && Math.abs(element.scrollLeft - (element.scrollWidth - element.clientWidth)) < 2)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/stats-mobile.png", fullPage: true });
});

test("stats and pagination copy switch across all five languages", async ({ page }) => {
  await prepare(page);
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { stats } = JSON.parse(readFileSync(new URL(`../src/translations/stats/${locale}.json`, import.meta.url), "utf8")) as { stats: Record<string, string> };
    await page.getByRole("combobox").selectOption(locale);
    for (const name of [stats.totalHours, stats.activityTitle, stats.last14Days, stats.historyTitle]) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: stats.loadMore, exact: true })).toBeVisible();
    await page.getByTestId("heatmap-grid").locator('[data-date="2026-09-20"]').hover();
    const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date("2026-09-20T00:00:00Z"));
    await expect(page.getByRole("tooltip")).toHaveText(stats.noSessions.replace("{date}", date));
  }
});

test("Finish invalidates the five-minute cached stats and adds real banked time", async ({ page }) => {
  test.setTimeout(60000); await prepare(page);
  await startSession(page);
  await page.clock.setFixedTime(new Date("2026-10-14T12:03:00Z"));
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("link", { name: "Done for now", exact: true }).click();
  await expect(page.getByTestId("stats-total")).toHaveText("40.1");
  await expect(page.getByTestId("session-history").locator("tbody tr").first()).toContainText("3m");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).filter((session: { actualSeconds: number }) => session.actualSeconds === 180).length)).toBe(1);
});

test("real profile showStreak preference hides the card", async ({ page }) => {
  await prepare(page);
  await page.evaluate(() => localStorage.setItem("ss_profile", JSON.stringify({ displayName: "", selectedTheme: "rain-desk", timezone: "UTC", showStreak: false, reduceMotion: false, webcamEnabled: false, ambienceEnabled: false })));
  await page.reload();
  await expect(page.getByTestId("stats-total")).toHaveText("40.0");
  await expect(page.getByTestId("streak-card")).toHaveCount(0);
});
