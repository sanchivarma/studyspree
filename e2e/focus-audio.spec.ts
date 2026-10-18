import { test, expect } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

test("requested music retain independent levels and the master is above the list", async ({ page }) => {
  test.setTimeout(60000);
  await signIn(page); const path = await startSession(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  const panel = page.getByTestId("ambience-popover");
  await expect(panel.getByRole("checkbox", { name: /Buddhist|OM chant|Tibetan/i })).toHaveCount(0);
  const master = panel.getByRole("slider", { name: "Background effects volume", exact: true });
  const choices = [["Medieval Warrior", "medieval-warrior", 0.25], ["Medieval Walk", "medieval-walk", 0.4], ["Medieval Knight", "medieval-knight", 0.6]] as const;
  for (const [name, , value] of choices) {
    const checkbox = panel.getByRole("checkbox", { name, exact: true });
    await checkbox.check();
    const slider = panel.getByRole("slider", { name: `${name} volume`, exact: true });
    await slider.evaluate((element, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, String(value));
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await expect(slider).toHaveValue(String(value));
  }
  const masterBounds = await master.boundingBox();
  const listBounds = await panel.getByRole("group", { name: "Background effects", exact: true }).boundingBox();
  expect(masterBounds!.y + masterBounds!.height).toBeLessThanOrEqual(listBounds!.y);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile") ?? "{}")?.effectVolumes)).toMatchObject(Object.fromEntries(choices.map(([, slug, value]) => [slug, value])));
  await page.reload(); await expect(page.getByTestId("session-screen")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  for (const [name, , value] of choices) {
    await expect(panel.getByRole("checkbox", { name, exact: true })).toBeChecked();
    await expect(panel.getByRole("slider", { name: `${name} volume`, exact: true })).toHaveValue(String(value));
  }
});
