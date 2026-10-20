import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("Virtual partners starts empty and stays open when the last choice is deselected", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  const picker = page.getByTestId("companion-mode-picker");
  await expect(picker.locator('[data-testid^="character-card-"][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("character-card-female-04").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).companionPreferences)).toEqual({ mode: "characters", characterSlugs: ["female-04"] });
  await page.getByTestId("character-card-female-04").click();
  await expect(page.getByRole("button", { name: "Virtual partners", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("character-card-female-04")).toBeVisible();
  await expect(picker.locator('[data-testid^="character-card-"][aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].companions)).toEqual({ mode: "solo", characterSlugs: [] });
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
});

test("Virtual partners shortcut has no default character and remembers explicit choices", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page); await page.goto("/study?mode=characters");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("character-card-male-02").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).companionPreferences.characterSlugs)).toEqual(["male-02"]);
  await page.reload();
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await expect(page.getByTestId("character-card-male-02")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
});
