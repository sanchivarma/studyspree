import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("all eight realistic partners animate in a session and preserve its timestamp", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  await page.getByTestId("character-card-realistic-01").click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByTestId("character-card-male-01").click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  for (let n = 2; n <= 8; n++) await page.getByTestId(`character-card-realistic-0${n}`).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  const startedAt = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt);
  for (let n = 1; n <= 8; n++) {
    const image = page.getByTestId(`character-loop-realistic-0${n}`).getByTestId("character-animation");
    await expect(image).toHaveAttribute("src", `/characters/realistic-0${n}/study-${n === 2 ? "v4" : "v3"}.gif`);
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
    expect(new Set(frames).size, `realistic-0${n} must visibly change`).toBeGreaterThan(1);
  }
  await page.reload();
  await expect(page.getByTestId("character-loop-realistic-08")).toHaveAttribute("data-animated", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(startedAt);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("session-companions").getByTestId("character-animation")).toHaveCount(0);
});

test("a missing realistic GIF keeps its poster and session usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/realistic-02/study-v4.gif", route => route.abort());
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Realistic", exact: true }).click();
  await page.getByTestId("character-card-realistic-02").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const tile = page.getByTestId("character-loop-realistic-02");
  await expect(tile).toHaveAttribute("data-animated", "false");
  await expect(tile.locator('img[src$="poster-v4.webp"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeEnabled();
});
