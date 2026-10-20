import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";
import { characters } from "../src/lib/characters/registry";

test("mixing all styles persists and realistic GIFs respect reduced motion", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Whimsical", exact: true }).click();
  await page.getByTestId("character-card-moss-fox").click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  await expect(page.getByText(/AI-generated.*reading GIF/).first()).toBeVisible();
  await page.getByTestId("character-card-realistic-01").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-companions").getByRole("img")).toHaveCount(3);
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  expect(original.companions.characterSlugs).toEqual(["male-01", "moss-fox", "realistic-01"]);
  await page.reload();
  await expect(page.getByTestId("character-loop-realistic-01")).toHaveAttribute("data-animated", "false");
  await expect(page.getByTestId("character-loop-realistic-01").locator("video")).toHaveCount(0);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0])).startedAt).toBe(original.startedAt);
});

test("companion videos decode at their registered durations with visible activity", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/login");
  const recordings = characters.filter(value => value.webm && value.mp4);
  expect(recordings.filter(value => value.style === "illustrated" || value.style === "whimsical")).toHaveLength(11);
  for (const character of recordings) for (const src of [character.webm!, character.mp4!]) {
    const result = await page.evaluate(async src => {
      const movie = document.createElement("video"); movie.muted = true; movie.preload = "auto";
      const ready = new Promise<void>((resolve, reject) => { movie.onloadeddata = () => resolve(); movie.onerror = () => reject(new Error(`Cannot decode ${src}`)); }); movie.src = src; await ready;
      const canvas = document.createElement("canvas"); canvas.width = 96; canvas.height = 72; const context = canvas.getContext("2d")!;
      const sample = async (at: number) => { const seek = new Promise<void>(resolve => { movie.onseeked = () => resolve(); }); movie.currentTime = at; await seek; context.drawImage(movie, 0, 0, 96, 72); return context.getImageData(0, 0, 96, 72).data; };
      const first = await sample(4), middle = await sample(Math.min(30.2, movie.duration * 0.7)); let difference = 0, brightness = 0;
      for (let i = 0; i < first.length; i++) if (i % 4 !== 3) { difference += Math.abs(first[i] - middle[i]); brightness += first[i]; }
      const result = { duration: movie.duration, difference, brightness: brightness / (96 * 72 * 3), width: movie.videoWidth };
      movie.removeAttribute("src"); movie.load(); return result;
    }, src);
    expect(character.loopSeconds, src).not.toBeNull();
    expect(result.duration, src).toBeCloseTo(character.loopSeconds!, 1);
    if (character.style === "illustrated" || character.style === "whimsical") {
      expect(result.duration, src).toBeGreaterThanOrEqual(120); expect(result.duration, src).toBeLessThan(181);
    }
    expect(result.width, src).toBe(320); expect(result.brightness, src).toBeGreaterThan(10); expect(result.difference, src).toBeGreaterThan(100);
  }
});
