import { expect, test } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

test("the new themes persist and switching during a session preserves its timer", async ({ page }) => {
  test.setTimeout(90000);
  await signIn(page); await startSession(page);
  const started = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt);
  for (const slug of ["nature-day", "nature-night", "sci-fi", "space"]) {
    await page.getByTestId("session-screen").dispatchEvent("touchstart");
    await page.getByRole("button", { name: "Switch theme", exact: true }).click();
    await page.getByTestId(`theme-card-${slug}`).click();
    await expect(page.getByTestId("theme-scene")).toHaveAttribute("data-theme", slug);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).selectedTheme)).toBe(slug);
  }
  await page.reload();
  await expect(page.getByTestId("theme-scene")).toHaveAttribute("data-theme", "space");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(started);
});

test("all eight new scene files decode and contain animated, muted footage", async ({ page }) => {
  await page.goto("/login");
  for (const slug of ["nature-day", "nature-night", "sci-fi", "space"]) for (const format of ["webm", "mp4"]) {
    const result = await page.evaluate(async src => {
      const video = document.createElement("video"); video.muted = true;
      const loaded = new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error("Cannot decode scene")); });
      video.src = src; await loaded;
      const canvas = document.createElement("canvas"); canvas.width = 96; canvas.height = 54; const ctx = canvas.getContext("2d")!;
      const sample = async (time: number) => { const seek = new Promise<void>(resolve => { video.onseeked = () => resolve(); }); video.currentTime = time; await seek; ctx.drawImage(video, 0, 0, 96, 54); return [...ctx.getImageData(0, 0, 96, 54).data]; };
      const first = await sample(0.2), second = await sample(3.7);
      const result = { duration: video.duration, width: video.videoWidth, difference: first.reduce((sum, value, index) => sum + Math.abs(value - second[index]), 0) };
      video.removeAttribute("src"); video.load(); return result;
    }, `/themes/${slug}/scene-v1.${format}`);
    expect(result.width).toBe(1280); expect(result.duration).toBeGreaterThan(7); expect(result.duration).toBeLessThan(10); expect(result.difference).toBeGreaterThan(0);
  }
});
