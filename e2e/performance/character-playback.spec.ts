import { expect, test, type BrowserContext } from "@playwright/test";
import { characters } from "../../src/lib/characters/registry";
import { createLocalAccount } from "../supabase/localAccount";
import { expectFastAction } from "./budget";

test.use({ reducedMotion: "no-preference" });
let cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await createLocalAccount(page, "Playback reader");
    await expect(page.locator('[data-repository-mode="server"]')).toBeVisible({ timeout: 30_000 });
    cookies = await context.cookies();
  } finally { await context.close(); }
});

for (const character of characters) test(`${character.slug}: video starts promptly, delivers frames and loops`, async ({ page, context }, info) => {
  await context.addCookies(cookies);
  await page.goto("/study?mode=characters");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await expect(page.getByTestId("character-card-medieval-scholar")).toHaveCount(0);
  await expect(page.getByTestId("character-card-medieval-scribe")).toHaveCount(0);
  await page.getByTestId(`character-card-${character.slug}`).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const video = page.getByTestId(`character-loop-${character.slug}`).locator("video");
  try {
    await expectFastAction(info, `${character.slug}: Start to moving video`, remaining => page.getByRole("button", { name: "Start", exact: true }).click({ timeout: remaining() }), async remaining => {
      await expect(video).toBeVisible({ timeout: remaining() });
      await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime), { timeout: remaining(), intervals: [30] }).toBeGreaterThan(0);
      await expect(video).toHaveCSS("opacity", "1", { timeout: remaining() });
    });
    expect(await video.evaluate(element => (element as HTMLVideoElement).muted)).toBe(true);
    expect(await video.evaluate(element => (element as HTMLVideoElement).currentSrc)).toContain("study-playback-v1.mp4");
    const quality = await video.evaluate(element => new Promise<{ fps: number; maxGapMs: number; droppedRatio: number }>((resolve, reject) => {
      const movie = element as HTMLVideoElement;
      const started = performance.now(), before = movie.getVideoPlaybackQuality();
      let previous: number | undefined, frames = 0, maxGapMs = 0;
      const timeout = window.setTimeout(() => { movie.cancelVideoFrameCallback(handle); reject(new Error("Video frame delivery stalled")); }, 2000);
      let handle = 0;
      const frame = (stamp: number) => {
        frames++;
        if (previous !== undefined) maxGapMs = Math.max(maxGapMs, stamp - previous);
        previous = stamp;
        if (stamp - started >= 650) {
          window.clearTimeout(timeout);
          const after = movie.getVideoPlaybackQuality();
          resolve({ fps: frames / ((stamp - started) / 1000), maxGapMs,
            droppedRatio: (after.droppedVideoFrames - before.droppedVideoFrames) / Math.max(1, after.totalVideoFrames - before.totalVideoFrames) });
        } else handle = movie.requestVideoFrameCallback(frame);
      };
      handle = movie.requestVideoFrameCallback(frame);
    }));
    await info.attach(`${character.slug}-frame-delivery`, { body: JSON.stringify(quality), contentType: "application/json" });
    expect(quality.fps, "Steady playback should deliver at least 24 painted frames per second").toBeGreaterThanOrEqual(24);
    expect(quality.maxGapMs, "Playback must not stall for an eighth of a second").toBeLessThanOrEqual(125);
    expect(quality.droppedRatio).toBeLessThanOrEqual(0.1);
    if (character.slug === "male-01") {
      await video.evaluate(element => { (element as HTMLVideoElement).dataset.playbackProbe = "retained"; });
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(video).toHaveJSProperty("paused", true);
      const pausedAt = await video.evaluate(element => (element as HTMLVideoElement).currentTime);
      await page.waitForTimeout(250);
      expect(await video.evaluate(element => Math.abs((element as HTMLVideoElement).currentTime - pausedAt))).toBeLessThan(0.02);
      await page.evaluate(() => { Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange")); });
      await expect(video).toHaveAttribute("data-playback-probe", "retained");
      await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime), { timeout: 2000 }).toBeGreaterThan(pausedAt);
    }
    await video.evaluate(element => { const movie = element as HTMLVideoElement; movie.currentTime = movie.duration - 0.2; });
    await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime), { timeout: 2000, intervals: [50] }).toBeLessThan(1.5);
    await expect(video).toHaveJSProperty("paused", false);
  } finally {
    const finish = page.getByRole("button", { name: "Finish", exact: true });
    if (await finish.isVisible()) { await finish.click(); await expect(page.getByTestId("complete-screen")).toBeVisible(); }
  }
});
