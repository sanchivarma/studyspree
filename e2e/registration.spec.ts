import { expect, test } from "@playwright/test";

test("public registration validates fields and confirmation before submission", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("tab", { name: "Register", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("First name", { exact: true })).toBeFocused();
  await expect(page.locator("form").getByRole("alert")).toHaveCount(5);
  const warning = page.locator("form").getByRole("alert").first();
  await expect(warning).toHaveCSS("color", "rgb(251, 146, 60)");
  await expect(warning.locator("svg.lucide-circle-alert")).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Alex");
  await page.getByLabel("Last name", { exact: true }).fill("Sample");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByLabel("Username", { exact: true }).fill("a/b");
  await page.getByLabel("Password", { exact: true }).fill("valid-password");
  await page.getByLabel("Confirm password", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.", { exact: true })).toBeVisible();
  await expect(page.getByText("Passwords must match.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Username", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Username", { exact: true })).toHaveCSS("border-color", "rgb(251, 146, 60)");
  await page.getByRole("tab", { name: "Login", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
});
