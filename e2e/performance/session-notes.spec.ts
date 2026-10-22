import { expect, test } from "@playwright/test";
import { createLocalAccount } from "../supabase/localAccount";
import { expectFastAction } from "./budget";

for (const mode of ["solo", "characters"]) test(`${mode}: private notes save promptly and a new session starts clean`, async ({ page }, info) => {
  await createLocalAccount(page, "Notes reader");
  await page.goto(`/study?mode=${mode}`);
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
  if (mode === "characters") {
    await page.getByRole("button", { name: "Choose companions", exact: true }).click();
    await page.getByTestId("character-card-male-01").click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  const original = page.url();
  await expectFastAction(info, `${mode}: open private notes`, remaining => page.getByRole("button", { name: "Session chat", exact: true }).click({ timeout: remaining() }), async remaining => {
    await expect(page.getByRole("textbox", { name: "Add a note", exact: true })).toBeEnabled({ timeout: remaining() });
    await expect(page.getByTestId("session-notes").getByRole("status")).toHaveCount(0, { timeout: remaining() });
    await expect(page.getByTestId("session-notes").getByRole("alert")).toHaveCount(0, { timeout: remaining() });
  });
  await expect(page.getByRole("heading", { name: "Your space for study notes", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Add a note", exact: true }).fill("Remember the example in chapter three.");
  await expectFastAction(info, `${mode}: save private note`, remaining => page.getByRole("button", { name: "Send", exact: true }).click({ timeout: remaining() }), async remaining => {
    await expect(page.getByRole("article").filter({ hasText: "Remember the example in chapter three." })).toBeVisible({ timeout: remaining() });
    await expect(page.getByRole("textbox", { name: "Add a note", exact: true })).toHaveValue("", { timeout: remaining() });
  });
  await page.reload();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  await expect(page).toHaveURL(original);
  await page.getByRole("button", { name: "Session chat", exact: true }).click();
  await expect(page.getByRole("article").filter({ hasText: "Remember the example in chapter three." })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
  const profile = await page.request.post("/api/repository", { data: { op: "profile" } });
  expect(await profile.json()).toMatchObject({ selectedTheme: "rain-desk", webcamEnabled: false, companionPreferences: { mode: "solo", characterSlugs: [] }, backgroundEffects: [] });
  await page.goto("/study");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "5 min just open it", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Choose companions", exact: true })).toContainText("Solo");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  await page.getByRole("button", { name: "Session chat", exact: true }).click();
  await expect(page.getByTestId("session-notes").getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
});
