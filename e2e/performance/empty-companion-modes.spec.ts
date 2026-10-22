import { expect, test } from "@playwright/test";
import { createLocalAccount } from "../supabase/localAccount";
import { expectFastAction } from "./budget";

for (const mode of ["solo", "characters", "people"] as const) {
  for (const visibility of mode === "solo" ? ["private"] as const : ["private", "public"] as const) {
    test(`${mode} ${visibility}: closing the drawer preserves an empty mode through Start and refresh`, async ({ page }, info) => {
      await createLocalAccount(page, "Mode reader");
      await page.goto("/study");
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled({ timeout: 30_000 });
      const choose = page.getByRole("button", { name: "Choose companions", exact: true });
      const label = { solo: "Solo", characters: "Virtual partners", people: "People" }[mode];
      await choose.click();
      // Switch away first so Solo is also tested as an explicit choice.
      await page.getByRole("button", { name: mode === "people" ? "Solo" : "People", exact: true }).click();
      await page.getByRole("button", { name: label, exact: true }).click();
      if (mode === "solo") {
        const desk = page.getByTestId("solo-scene-picker").locator("fieldset").first().locator('[aria-pressed="true"]');
        if (await desk.count()) {
          const saved = page.waitForResponse(response => response.url().endsWith("/api/repository") && response.request().postDataJSON()?.op === "updateProfile");
          await desk.click();
          expect((await saved).ok()).toBe(true);
          await expect(page.getByTestId("solo-scene-picker").locator("fieldset").first().locator('[aria-pressed="true"]')).toHaveCount(0);
        }
      }
      if (mode === "characters") {
        await page.getByTestId("character-card-male-01").click();
        await page.getByTestId("character-card-male-01").click();
        await expect(page.getByTestId("companion-mode-picker").locator('[data-testid^="character-card-"][aria-pressed="true"]')).toHaveCount(0);
      }
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await expect(choose).toContainText(label);
      await choose.click();
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("radio", { name: visibility === "public" ? "Public" : "Private", exact: true }).check();
      await expectFastAction(info, `${mode} ${visibility}: Start empty session`, remaining => page.getByRole("button", { name: "Start", exact: true }).click({ timeout: remaining() }), async remaining => {
        await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible({ timeout: remaining() });
      });
      const url = page.url();
      const active = await page.request.post("/api/repository", { data: { op: "active" } });
      expect(active.ok()).toBe(true);
      expect(await active.json()).toMatchObject({ companions: { mode, characterSlugs: [] }, visibility });
      await expect(page.locator('[data-testid^="character-loop-"]')).toHaveCount(0);
      if (mode === "solo") await expect(page.getByTestId("solo-study-scene")).toHaveAttribute("data-desk", "none");
      await page.reload();
      await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
      await expect(page).toHaveURL(url);
      const resumed = await page.request.post("/api/repository", { data: { op: "active" } });
      expect(await resumed.json()).toMatchObject({ companions: { mode, characterSlugs: [] } });
      await page.getByRole("button", { name: "Finish", exact: true }).click();
      await expect(page.getByTestId("complete-screen")).toBeVisible();
      await page.goto("/study");
      await expect(choose).toContainText("Solo");
    });
  }
}
