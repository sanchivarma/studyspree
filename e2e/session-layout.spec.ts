import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";
import { characterSlugs } from "../src/types/characters";

for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 667 }, { width: 844, height: 390 }]) {
  test(`twenty tiles fit with pagination and a compact bottom timer at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    await signIn(page); await page.goto("/study");
    await page.getByRole("button", { name: "Choose companions", exact: true }).click();
    await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
    // Exercise the picker past the former eight-character cap.
    for (const slug of characterSlugs.slice(1, 9)) await page.getByTestId(`character-card-${slug}`).click();
    await expect(page.getByTestId("character-card-moss-fox")).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
    // Supply a larger persisted roster, then let repository validation read it.
    await page.evaluate(slugs => {
      const sessions = JSON.parse(localStorage.getItem("ss_sessions")!);
      sessions[0].companions = { mode: "characters", characterSlugs: slugs };
      localStorage.setItem("ss_sessions", JSON.stringify(sessions));
    }, [...characterSlugs]);
    await page.reload();
    const grid = page.getByTestId("session-companions");
    await expect(grid.locator(":scope > [data-tile-id]")).toHaveCount(20);
    const firstBox = await grid.locator(":scope > [data-tile-id]").first().boundingBox();
    const gridBox = await grid.boundingBox();
    expect(gridBox!.y).toBeLessThan(10);
    const bounds = await grid.evaluate(node => ({ width: node.clientWidth, height: node.clientHeight, scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight }));
    expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.height);
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width);
    await expect(page.getByRole("progressbar")).toHaveCSS("height", "4px");
    expect((await page.getByTestId("session-elapsed").boundingBox())!.y).toBeGreaterThan(gridBox!.y + gridBox!.height);
    await page.getByTestId("session-screen").dispatchEvent("touchstart");
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(grid.locator(":scope > [data-tile-id]")).toHaveCount(3);
    const secondBox = await grid.locator(":scope > [data-tile-id]").first().boundingBox();
    expect(secondBox!.width * secondBox!.height).toBeGreaterThan(firstBox!.width * firstBox!.height);
    for (const name of ["Leilani", "Valeria", "Andre"]) {
      await page.getByTestId("session-screen").dispatchEvent("touchstart");
      await page.getByRole("button", { name: `Remove ${name}`, exact: true }).click();
    }
    await expect(grid.locator(":scope > [data-tile-id]")).toHaveCount(20);
    await expect(page.getByRole("button", { name: "Next page", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await page.screenshot({ path: `test-results/session-grid-${viewport.width}.png` });
  });
}

test("side controls leave the stage clear and direct removal preserves the timer", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByTestId("character-card-female-01").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
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
