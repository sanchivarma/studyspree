import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

async function setVolume(page: import("@playwright/test").Page, name: string, value: string) {
  await page.getByRole("slider", { name, exact: true }).evaluate((element, next) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

test("every setting saves without a Save button and survives refresh without changing history", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await signIn(page); await page.goto("/settings");
  await expect(page.getByRole("combobox", { name: "Timezone", exact: true })).toHaveValue(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
  await page.evaluate(() => {
    localStorage.setItem("ss_sessions", JSON.stringify([{ id: "timezone-history", startedAt: "2026-10-12T23:30:00Z",
      endedAt: "2026-10-12T23:35:00Z", localDate: "2026-10-12", plannedMinutes: 5, actualSeconds: 300,
      endedReason: "completed", themeSlug: "rain-desk", task: null }]));
  });
  const history = await page.evaluate(() => localStorage.getItem("ss_sessions"));
  await page.getByLabel("Display name", { exact: true }).fill("Alex");
  await page.getByRole("switch", { name: "Reduce motion", exact: true }).click();
  await page.getByRole("switch", { name: "Ambience", exact: true }).click();
  await setVolume(page, "Music", "0.4"); await setVolume(page, "Room sound", "0.6");
  await page.getByRole("combobox", { name: "Music tracks", exact: true }).selectOption("silent");
  await page.getByRole("switch", { name: "Show streak", exact: true }).click();
  await page.getByRole("combobox", { name: "Timezone", exact: true }).selectOption("Asia/Tokyo");
  await expect(page.getByRole("status")).toContainText("Future sessions use your new timezone. Your saved history stays unchanged.");
  await page.getByRole("button", { name: "Theme Rainy Desk", exact: true }).click();
  await page.getByTestId("theme-card-dorm-bunk").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!))).toMatchObject({
    displayName: "Alex", reduceMotion: true, ambienceEnabled: true, musicVolume: .4, roomVolume: .6,
    musicTrack: "silent", showStreak: false, timezone: "Asia/Tokyo", selectedTheme: "dorm-bunk",
  });
  expect(await page.evaluate(() => localStorage.getItem("ss_sessions"))).toBe(history);
  await expect(page.getByRole("button", { name: /save/i })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Alex");
  await expect(page.getByRole("switch", { name: "Reduce motion", exact: true })).toBeChecked();
  await expect(page.getByRole("slider", { name: "Room sound", exact: true })).toHaveValue("0.6");
  await expect(page.getByRole("combobox", { name: "Timezone", exact: true })).toHaveValue("Asia/Tokyo");
  await page.goto("/stats");
  await expect(page.getByTestId("stats-total")).toHaveText("0.1");
  await expect(page.getByTestId("streak-card")).toHaveCount(0);
  await expect(page.getByTestId("heatmap-grid").locator('[data-date="2026-10-12"]')).toHaveAttribute("data-level", "1");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Alex");
  expect(errors).toEqual([]);
});

test("Settings requests permission in context and rolls back a denied camera opt-in", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { cameraRequests: 0 });
    navigator.mediaDevices.getUserMedia = async constraints => {
      if (constraints?.audio !== false) throw new Error("Audio must remain disabled");
      Object.assign(window, { cameraRequests: (window as unknown as { cameraRequests: number }).cameraRequests + 1 });
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await signIn(page); await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: "Self-view", exact: true });
  await toggle.click();
  await expect(page.getByText("Enable camera access in your browser settings.", { exact: true })).toBeVisible();
  await expect(toggle).not.toBeChecked();
  expect(await page.evaluate(() => (window as unknown as { cameraRequests: number }).cameraRequests)).toBe(1);
  await expect(page.getByLabel("Display name", { exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Dismiss camera note", exact: true }).click();
  await expect(page.getByText("Enable camera access in your browser settings.", { exact: true })).toHaveCount(0);
});

test("Settings fits a phone and translates its controls into all five languages", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await signIn(page);
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { settings } = JSON.parse(readFileSync(new URL(`../src/translations/settings/${locale}.json`, import.meta.url), "utf8")) as { settings: Record<string, string> };
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto("/settings");
    await expect(page.getByLabel(settings.displayName, { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: settings.timezone, exact: true })).toBeVisible();
    await expect(page.getByRole("switch", { name: settings.reduceMotion, exact: true })).toBeVisible();
    await expect(page.getByRole("switch", { name: settings.showStreak, exact: true })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (locale === "en") await page.screenshot({ path: "test-results/settings-mobile.png", fullPage: true });
  }
});
