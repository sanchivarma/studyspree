import { expect, test } from "@playwright/test";
import { settleClock, signIn, startSession } from "./sessionFixtures";

test("Study picker supports arrows, selection, focus return and persistence into Settings", async ({ page }) => {
  test.setTimeout(60000); // Several authenticated routes may compile on this first visit.
  await signIn(page);
  await page.goto("/study");
  const trigger = page.getByRole("button", { name: "Switch theme", exact: true });
  await trigger.click();
  const sheet = page.getByTestId("theme-sheet");
  await expect(sheet).toHaveAttribute("data-side", "right");
  await expect(sheet.getByRole("button", { pressed: true })).toHaveAttribute("data-testid", "theme-card-rain-desk");
  await expect(page.getByTestId("theme-card-rain-desk")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("theme-card-night-shift")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("theme-card-dorm-bunk")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(sheet).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId("theme-scene").getByTestId("scene-video")).toHaveAttribute("data-theme", "dorm-bunk");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).selectedTheme)).toBe("dorm-bunk");
  await expect(page).toHaveURL(/\/study$/); // Enter selected a card, without starting.
  await page.reload();
  await expect(page.getByTestId("theme-scene").getByTestId("scene-video")).toHaveAttribute("data-theme", "dorm-bunk");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Theme Dorm Bunk", exact: true }).click();
  await page.getByTestId("theme-card-balcony-dusk").click();
  await expect(page.getByRole("button", { name: "Theme Balcony Dusk", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).selectedTheme)).toBe("balcony-dusk");
  await page.goto("/");
  await expect(page.getByTestId("theme-scene").getByTestId("scene-video")).toHaveAttribute("data-theme", "balcony-dusk");
});

test("phone picker opens at the bottom, fits the viewport and uses translated copy", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("combobox").selectOption("de");
  await page.getByRole("button", { name: "Design wechseln", exact: true }).click();
  const sheet = page.getByTestId("theme-sheet");
  await expect(sheet).toHaveAttribute("data-side", "bottom");
  await expect(sheet.getByRole("heading", { name: "Wähle dein Design" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await sheet.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  await expect(sheet.getByTestId("theme-card-dorm-bunk")).toBeInViewport();
  await sheet.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(sheet).toHaveCount(0);
});

test("changing an active scene preserves session timestamps and timer; Escape closes the sheet", async ({ page }) => {
  test.setTimeout(60000);
  await signIn(page);
  await page.clock.install({ time: new Date("2026-10-13T12:00:00Z") });
  const path = await startSession(page, "Study chapter", 25);
  await page.clock.pauseAt(await page.evaluate(() => new Date(Date.now())));
  const baseline = await page.getByTestId("session-time").textContent();
  await page.clock.runFor(10000);
  await page.mouse.move(20, 20);
  const before = await page.evaluate(() => ({ active: localStorage.getItem("ss_active"), sessions: localStorage.getItem("ss_sessions") }));
  await page.getByRole("button", { name: "Switch theme", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.clock.runFor(20);
  await expect(page.getByTestId("theme-sheet")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.getByRole("button", { name: "Switch theme", exact: true }).click();
  await page.getByTestId("theme-card-night-shift").click();
  await page.clock.runFor(20);
  await expect(page.getByTestId("theme-scene").getByTestId("scene-video")).toHaveAttribute("data-theme", "night-shift");
  expect(await page.evaluate(() => ({ active: localStorage.getItem("ss_active"), sessions: localStorage.getItem("ss_sessions") }))).toEqual(before);
  await page.clock.runFor(5000);
  await page.mouse.move(30, 30);
  const remaining = await page.getByTestId("session-time").textContent();
  const seconds = (text: string | null) => { const [m, s] = text!.split(" left")[0].split(":").map(Number); return m * 60 + s; };
  expect(seconds(baseline) - seconds(remaining)).toBe(15);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).selectedTheme)).toBe("night-shift");
  await page.reload(); await settleClock(page, "session-screen");
  await expect.poll(async () => {
    await page.clock.runFor(1);
    return page.getByTestId("theme-scene").getByTestId("scene-video").getAttribute("data-theme");
  }).toBe("night-shift");
  const resumed = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("ss_sessions")!)[0];
    return { session, remaining: session.plannedMinutes * 60 - Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000) };
  });
  expect(resumed.session).toEqual(JSON.parse(before.sessions!)[0]);
  expect(seconds(await page.getByTestId("session-time").textContent())).toBe(resumed.remaining);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await settleClock(page, "complete-screen");
  await expect(page).toHaveURL(/\/complete$/);
});
