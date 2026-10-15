import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("date ranges filter history and expose an accessible table without altering lifetime totals", async ({ page }) => {
  test.setTimeout(60000);
  await page.clock.setFixedTime(new Date("2026-10-14T12:00:00Z"));
  await signIn(page);
  await page.goto("/dev");
  await page.getByRole("button", { name: "Seed 40 hours", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Sample history is ready.");
  await page.goto("/stats");
  await expect(page.getByTestId("stats-total")).toHaveText("40.0");
  await page.getByLabel("Date range", { exact: true }).selectOption("7");
  const expected = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).filter((session: { localDate: string }) => session.localDate >= "2026-10-08" && session.localDate <= "2026-10-14").length);
  await expect(page.getByTestId("session-history").locator("tbody tr")).toHaveCount(expected);
  await page.getByText("Show data table", { exact: true }).click();
  await expect(page.getByRole("table", { name: "Study time by date", exact: true })).toBeVisible();
  await expect(page.getByTestId("stats-total")).toHaveText("40.0");
  await page.getByLabel("Study companions", { exact: true }).selectOption("characters");
  await expect(page.getByTestId("session-history").locator("tbody tr")).toHaveCount(0);
  await page.getByLabel("Date range", { exact: true }).selectOption("custom");
  await page.getByLabel("From", { exact: true }).fill("2026-10-15");
  await page.getByLabel("To", { exact: true }).fill("2026-10-14");
  await expect(page.getByTestId("stats-screen").getByRole("alert")).toContainText("Choose a valid start and finish date.");
  await expect(page.getByLabel("Date range", { exact: true })).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("2026-10-01");
  await expect(page.getByTestId("range-total")).toBeVisible();
});
