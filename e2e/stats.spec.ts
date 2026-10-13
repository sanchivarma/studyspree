import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const value = (key: string) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill(value("DEV_ADMIN_USERNAME"));
  await page.getByLabel("Password", { exact: true }).fill(value("DEV_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/stats");
  await expect(page.getByTestId("stats-screen")).toBeVisible();
}

test("stats totals stay fixed and the page contains a year, fourteen bars and twenty sessions", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Stats", exact: true })).toBeVisible();
  const total = await page.getByTestId("stats-total").innerText();
  expect(total).toMatch(/^\d+\.\d$/);
  await expect(page.getByTestId("heatmap-grid").locator("button")).toHaveCount(371);
  await expect(page.getByTestId("heatmap-grid").locator("button:not(:disabled)")).toHaveCount(365);
  await expect(page.getByTestId("recent-bars").getByRole("img")).toHaveCount(14);
  await expect(page.getByTestId("session-history").locator("tbody tr")).toHaveCount(20);
  // The development profile opts out of streak display.
  await expect(page.getByTestId("streak-card")).toHaveCount(0);
  expect(await page.getByTestId("heatmap-grid").locator("button").evaluateAll((cells) => cells.every((cell) => Boolean(cell.getAttribute("aria-label"))))).toBe(true);
  await page.reload();
  await expect(page.getByTestId("stats-total")).toHaveText(total);
  await page.screenshot({ path: "test-results/stats-desktop.png", fullPage: true });
});

test("heatmap uses neutral zero cells, meaningful tooltips and safe arrow-key movement", async ({ page }) => {
  await signIn(page);
  const grid = page.getByTestId("heatmap-grid");
  const zero = grid.locator('[data-date="2026-10-09"]');
  await expect(zero).toHaveAttribute("data-level", "0");
  await expect(zero).toHaveCSS("border-top-width", "0px");
  expect(await zero.evaluate((cell) => (cell as HTMLElement).style.backgroundColor)).toBe("var(--grey-zero)");
  expect(await zero.boundingBox()).toMatchObject({ width: 11, height: 11 });
  await expect(zero).toHaveCSS("border-radius", "2px");
  await zero.hover();
  await expect(page.getByRole("tooltip")).toHaveText("No sessions on 9 October");
  const latest = grid.locator('[data-date="2026-10-13"]');
  await latest.hover();
  await expect(page.getByRole("tooltip")).toContainText("on 13 October");
  await latest.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(grid.locator('[data-date="2026-10-06"]')).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(grid.locator('[data-date="2026-10-05"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(latest).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(latest).toBeFocused();
  const future = grid.locator('[data-date="2026-10-14"]');
  await expect(future).toBeDisabled();
  await expect(future).toHaveCSS("opacity", "0.03");
  await expect(future).toHaveCSS("pointer-events", "none");
  await page.keyboard.press("Control+Home");
  await expect(grid.locator('[data-date="2025-10-14"]')).toBeFocused();
  await page.keyboard.press("Control+End");
  await expect(latest).toBeFocused();
  await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
});

test("mobile heatmap starts at the right edge without overflowing the page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page);
  const scroller = page.getByTestId("heatmap-scroll");
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft > 0 && Math.abs(element.scrollLeft - (element.scrollWidth - element.clientWidth)) < 2)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/stats-mobile.png", fullPage: true });
});

test("stats copy and tooltips switch across all five languages", async ({ page }) => {
  await signIn(page);
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { stats } = JSON.parse(readFileSync(new URL(`../src/translations/stats/${locale}.json`, import.meta.url), "utf8")) as { stats: { totalHours: string; activityTitle: string; last14Days: string; historyTitle: string; noSessions: string } };
    await page.getByRole("combobox").selectOption(locale);
    await expect(page.getByRole("heading", { name: stats.totalHours, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: stats.activityTitle, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: stats.last14Days, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: stats.historyTitle, exact: true })).toBeVisible();
    await page.getByTestId("heatmap-grid").locator('[data-date="2026-10-09"]').hover();
    const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date("2026-10-09T00:00:00Z"));
    await expect(page.getByRole("tooltip")).toHaveText(stats.noSessions.replace("{date}", date));
  }
});
