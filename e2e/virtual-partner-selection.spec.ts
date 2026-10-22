import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("People stays on setup and exposes selectable Public and Private choices", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(page).toHaveURL(/\/study$/);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose companions", exact: true })).toContainText("People");
  await page.getByRole("radio", { name: "Public", exact: true }).check();
  await expect(page.getByRole("radio", { name: "Public", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "Private", exact: true }).check();
  await expect(page.getByRole("radio", { name: "Private", exact: true })).toBeChecked();
});

test("Study setup has no session frame or video until Start", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  for (const path of ["/study", "/study?mode=solo", "/study?mode=characters"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(page.getByTestId("solo-study-scene")).toHaveCount(0);
    await expect(page.getByTestId("theme-scene")).toHaveCount(0);
    await expect(page.locator("video")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("theme-scene")).toBeVisible();
});

test("Virtual partners starts empty and stays open when the last choice is deselected", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  const picker = page.getByTestId("companion-mode-picker");
  await expect(picker.locator('[data-testid^="character-card-"][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("character-card-female-04").click();
  await expect(page.getByTestId("character-card-female-04")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("character-card-female-04").click();
  await expect(page.getByRole("button", { name: "Virtual partners", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("character-card-female-04")).toBeVisible();
  await expect(picker.locator('[data-testid^="character-card-"][aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Choose companions", exact: true })).toContainText("Virtual partners");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Virtual partners", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].companions)).toEqual({ mode: "characters", characterSlugs: [] });
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
});

test("Virtual partners ignores saved Noah and starts each new setup empty", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page); await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByTestId("character-card-male-01").click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/study?mode=characters");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("character-card-male-02").click();
  await expect(page.getByTestId("character-card-male-02")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await expect(page.getByTestId("character-card-male-02")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].companions.characterSlugs)).toEqual([]);
});
