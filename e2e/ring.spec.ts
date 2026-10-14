import { expect, test } from "@playwright/test";
import { freezeClock, signIn, startSession, settleClock } from "./sessionFixtures";

test("ring depletes between ticks, pauses hidden, and the title counts down and restores", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page); await freezeClock(page);
  await page.goto("/study");
  const originalTitle = await page.title();
  await startSession(page);
  const arc = page.getByTestId("depleting-arc");
  const offset = async () => Number(await arc.getAttribute("stroke-dashoffset"));
  await expect(page).toHaveTitle("5:00 · StudySpree");
  const initial = await offset();
  await page.clock.runFor(400);
  const partial = await offset();
  expect(partial).toBeGreaterThan(initial);
  await expect(page.getByTestId("session-time")).toHaveText("5:00 left");
  await page.clock.runFor(700);
  await expect(page).toHaveTitle("4:59 · StudySpree");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  const paused = await offset();
  await page.clock.runFor(10_000);
  expect(await offset()).toBe(paused);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.clock.runFor(50);
  expect(await offset()).toBeGreaterThan(paused);
  await expect(page).toHaveTitle("4:49 · StudySpree");
  await page.keyboard.press("Escape");
  await settleClock(page, "complete-screen");
  await expect(page).toHaveTitle(originalTitle);
});

test("reduced-motion ring changes once per minute while digits and title stay live", async ({ page }) => {
  await signIn(page); await freezeClock(page);
  await startSession(page);
  const arc = page.getByTestId("depleting-arc");
  const initial = await arc.getAttribute("stroke-dashoffset");
  await page.clock.runFor(30_000);
  await expect(arc).toHaveAttribute("stroke-dashoffset", initial!);
  await expect(page).toHaveTitle("4:30 · StudySpree");
  await page.clock.runFor(30_000);
  expect(Number(await arc.getAttribute("stroke-dashoffset"))).toBeGreaterThan(Number(initial));
});

test("Open shows a rotating quarter arc and hour-aware elapsed title", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page); await freezeClock(page);
  await startSession(page, undefined, null);
  const arc = page.getByTestId("depleting-arc");
  const lengths = (await arc.getAttribute("stroke-dasharray"))!.split(" ").map(Number);
  expect(lengths[1] / lengths[0]).toBeCloseTo(3);
  const initial = Number(await arc.getAttribute("stroke-dashoffset"));
  await page.clock.runFor(500);
  expect(Number(await arc.getAttribute("stroke-dashoffset"))).toBeLessThan(initial);
  await page.clock.fastForward(3600_000);
  await expect(page.getByTestId("session-time")).toHaveText("1:00:00 elapsed");
  await expect(page).toHaveTitle("1:00:00 · StudySpree");
});

test("ended session URLs return to their persisted completion summary", async ({ page }) => {
  await signIn(page);
  const path = await startSession(page);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`${path}/complete$`));
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(`${path}/complete$`));
});
