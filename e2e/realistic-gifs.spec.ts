import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("the original eight realistic partners animate in a session and preserve its timestamp", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  await page.getByTestId("character-card-realistic-01").click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  for (let n = 2; n <= 8; n++) await page.getByTestId(`character-card-realistic-0${n}`).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  const startedAt = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt);
  for (let n = 1; n <= 8; n++) {
    const image = page.getByTestId(`character-loop-realistic-0${n}`).getByTestId("character-animation");
    await expect(image).toHaveAttribute("src", `/characters/realistic-0${n}/study-${n === 1 ? "v13" : "v12"}.gif`);
    await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBe(n === 2 ? 320 : 360);
  }
  // Sample actual rendered GIF pixels; metadata alone cannot prove browser playback.
  for (const n of [1, 2]) {
    const image = page.getByTestId(`character-loop-realistic-0${n}`).getByTestId("character-animation");
    // Canvas drawImage can select an animated image's default frame. Compare
    // actual browser-painted pixels instead, with screenshot animation enabled.
    const frames: string[] = [];
    for (let i = 0; i < 4; i++) {
      frames.push((await image.screenshot({ animations: "allow" })).toString("base64"));
      await page.waitForTimeout(450); // Sample distinct moments of this animation.
    }
    if (new Set(frames).size === 1) {
      // Reading pauses are deliberately 15–20 seconds. Wait for the real
      // action instead of requiring movement during the quiet reading hold.
      await expect.poll(async () => (await image.screenshot({ animations: "allow" })).toString("base64"), { timeout: 30000, intervals: [500] }).not.toBe(frames[0]);
    }
  }
  await page.reload();
  await expect(page.getByTestId("character-loop-realistic-08")).toHaveAttribute("data-animated", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(startedAt);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("session-companions").getByTestId("character-animation")).toHaveCount(0);
});

test("four expanded partners mix with existing styles, animate and persist", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Whimsical", exact: true }).click();
  await page.getByTestId("character-card-moss-fox").click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  for (const label of ["Central Asian", "Pacific Islander", "Indigenous Andean", "Afro-Caribbean"]) await expect(page.getByText(label, { exact: true })).toBeVisible();
  for (const slug of ["realistic-09", "realistic-10", "realistic-11", "realistic-12"]) await page.getByTestId(`character-card-${slug}`).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-companions").getByRole("img")).toHaveCount(6);
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  for (const slug of ["realistic-09", "realistic-10", "realistic-11", "realistic-12"]) {
    const image = page.getByTestId(`character-loop-${slug}`).getByTestId("character-animation");
    await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBe(320);
    const frames: string[] = [];
    for (let sample = 0; sample < 3; sample++) {
      frames.push((await image.screenshot({ animations: "allow" })).toString("base64"));
      await page.waitForTimeout(250); // Compare actual browser-painted GIF frames.
    }
    if (new Set(frames).size === 1) await expect.poll(async () => (await image.screenshot({ animations: "allow" })).toString("base64"), { timeout: 30000, intervals: [500] }).not.toBe(frames[0]);
  }
  await page.reload();
  await expect(page.getByTestId("character-loop-realistic-12")).toHaveAttribute("data-animated", "true");
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  expect(restored.startedAt).toBe(original.startedAt);
  expect(restored.companions).toEqual(original.companions);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("session-companions").getByTestId("character-animation")).toHaveCount(0);
});

test("a missing realistic GIF keeps its poster and session usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let blocked = 0;
  await page.route("**/realistic-02/study-v12.gif", route => { blocked++; return route.abort(); });
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  await page.getByTestId("character-card-realistic-02").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const tile = page.getByTestId("character-loop-realistic-02");
  await expect.poll(() => blocked).toBeGreaterThan(0);
  await expect(tile).toHaveAttribute("data-animated", "false");
  await expect(tile.locator('img[src$="poster-v4.webp"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeEnabled();
});
