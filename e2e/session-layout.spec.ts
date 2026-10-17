import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("side controls leave the stage clear and direct removal preserves the timer", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByTestId("character-card-female-01").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const stage = page.getByTestId("session-companions");
  await expect(stage.getByRole("img")).toHaveCount(2);
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  const controlsBox = await page.getByTestId("companion-side-controls").boundingBox();
  const stageBox = await stage.boundingBox();
  expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(stageBox!.x);
  await page.getByRole("button", { name: "Remove Maya", exact: true }).click();
  await expect(stage.getByRole("img")).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId("character-loop-female-01")).toHaveCount(0);
  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  expect(updated.startedAt).toBe(original.startedAt);
  expect(updated.id).toBe(original.id);
  expect(updated.companions.characterSlugs).toEqual(["male-01"]);
});
