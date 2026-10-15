import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

test("development profile editing persists, keeps history and never pretends to publish", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  const form = page.getByRole("form", { name: "Edit profile" });
  await expect(form.getByText(/Development preview/)).toBeVisible();
  await form.getByLabel("Display name", { exact: true }).fill("Focused Reader");
  await form.getByLabel("About you", { exact: true }).fill("Learning at my pace.");
  await form.getByLabel("Interests", { exact: true }).fill("Math, Books");
  await form.getByLabel("Link 1 label").fill("Portfolio");
  await form.getByLabel("Link 1 URL").fill("javascript:alert(1)");
  await form.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText("Check your fields, tags and HTTPS links.");
  await form.getByLabel("Link 1 URL").fill("https://example.com");
  await form.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(form.getByRole("status")).toHaveText("Profile saved.");
  await expect(form.getByRole("checkbox")).toBeDisabled();
  await page.reload();
  await expect(form.getByLabel("Display name", { exact: true })).toHaveValue("Focused Reader");
  await expect(page.getByRole("link", { name: "Portfolio", exact: true })).toHaveAttribute("rel", "noopener noreferrer nofollow");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_directory_profile")!));
  expect(stored.isPublic).toBe(false);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const [locale, title] of [["de", "Profil"], ["fr", "Profil"], ["pl", "Profil"], ["it", "Profilo"], ["en", "Profile"]]) {
    await page.getByTestId("language-selector").selectOption(locale);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await expect.poll(async () => (await page.context().cookies()).find(cookie => cookie.name === "ss_locale")?.value).toBe(locale);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("profile-mobile.png"), fullPage: true });
  await page.goto("/people/ss_admin");
  await expect(page.getByTestId("public-profile").getByRole("status")).toHaveText("Profile unavailable.");
});
