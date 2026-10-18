import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("restored realistic media stays mounted through timer ticks and idle caption changes", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const replacements: string[] = [];
  page.on("request", request => {
    if (/\/characters\/realistic-.*\/study-v[569]\./.test(request.url())) replacements.push(request.url());
  });
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  for (const slug of ["realistic-01", "realistic-06", "medieval-scribe", "tesla"]) {
    await page.getByTestId(`character-card-${slug}`).click();
  }
  await page.getByTestId("character-card-male-01").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const stage = page.getByTestId("session-companions");
  const arun = stage.getByTestId("character-loop-realistic-01").getByTestId("character-animation");
  await expect(arun).toHaveAttribute("src", "/characters/realistic-01/study-v3.gif");
  await expect.poll(() => arun.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(360);
  const original = await arun.elementHandle();
  const startedAt = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt);
  await page.mouse.move(20, 20);
  await expect(page.getByTestId("session-screen")).toHaveAttribute("data-controls-visible", "false", { timeout: 10000 });
  await expect(stage.getByTestId("character-caption-realistic-01")).toHaveCSS("opacity", "0");
  expect(await arun.evaluate((element, previous) => element === previous, original)).toBe(true);
  await page.mouse.move(25, 25);
  await expect(stage.getByTestId("character-caption-realistic-01")).toHaveCSS("opacity", "1");
  expect(await arun.evaluate((element, previous) => element === previous, original)).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(startedAt);
  expect(replacements).toEqual([]);
  await page.screenshot({ path: "test-results/restored-companion-playback.png" });
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
});
