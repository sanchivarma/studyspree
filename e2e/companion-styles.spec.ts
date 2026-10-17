import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";
import { characters } from "../src/lib/characters/registry";

test("mixing all styles persists and realistic previews are honestly static", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Whimsical", exact: true }).click();
  await page.getByTestId("character-card-moss-fox").click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  await expect(page.getByText("AI-generated · static preview").first()).toBeVisible();
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

test("all eleven long companion recordings decode as 2–3-minute videos with visible activity", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/login");
  for (const character of characters.filter(value => value.loopSeconds !== null)) for (const src of [character.webm!, character.mp4!]) {
    const result = await page.evaluate(async src => {
      const movie = document.createElement("video"); movie.muted = true; movie.preload = "auto";
      const ready = new Promise<void>((resolve, reject) => { movie.onloadeddata = () => resolve(); movie.onerror = () => reject(new Error(`Cannot decode ${src}`)); }); movie.src = src; await ready;
      const canvas = document.createElement("canvas"); canvas.width = 96; canvas.height = 72; const context = canvas.getContext("2d")!;
      const sample = async (at: number) => { const seek = new Promise<void>(resolve => { movie.onseeked = () => resolve(); }); movie.currentTime = at; await seek; context.drawImage(movie, 0, 0, 96, 72); return context.getImageData(0, 0, 96, 72).data; };
      const first = await sample(4), middle = await sample(30.2); let difference = 0, brightness = 0;
      for (let i = 0; i < first.length; i++) if (i % 4 !== 3) { difference += Math.abs(first[i] - middle[i]); brightness += first[i]; }
      const result = { duration: movie.duration, difference, brightness: brightness / (96 * 72 * 3), width: movie.videoWidth };
      movie.removeAttribute("src"); movie.load(); return result;
    }, src);
    expect(result.duration, src).toBeGreaterThanOrEqual(120); expect(result.duration, src).toBeLessThan(181);
    expect(result.width).toBe(480); expect(result.brightness).toBeGreaterThan(10); expect(result.difference).toBeGreaterThan(100);
  }
});
