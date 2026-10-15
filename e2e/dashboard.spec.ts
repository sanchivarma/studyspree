import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("Home opens character setup and keeps theme selection independent", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "How would you like to study?" })).toBeVisible();
  await expect(page.getByText("Shared rooms are coming later.", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Join", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /Virtual partners/ }).click();
  await expect(page).toHaveURL(/\/study\?mode=characters$/);
  await expect(page.getByRole("button", { name: "Choose companions", exact: true })).toContainText("Virtual partners");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("session-companions").getByRole("img")).toHaveCount(1);
});

test("Solo shortcut overrides saved characters for the new session without erasing preferences", async ({ page }) => {
  test.setTimeout(60000); // Two setup visits plus Home navigation and a new session.
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByTestId("character-card-female-04").click();
  await page.getByTestId("character-card-male-01").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).companionPreferences.characterSlugs)).toEqual(["female-04"]);
  await page.goto("/");
  await page.getByRole("link", { name: /Solo/ }).click();
  await expect(page).toHaveURL(/\/study\?mode=solo$/, { timeout: 15000 });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].companions)).toEqual({ mode: "solo", characterSlugs: [] });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).companionPreferences)).toEqual({ mode: "characters", characterSlugs: ["female-04"] });
});
