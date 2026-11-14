import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

async function fillRegistration(page: Page) {
  await page.goto("/register");
  await page.getByLabel("First name", { exact: true }).fill("Alex");
  await page.getByLabel("Last name", { exact: true }).fill("Sample");
  await page.getByLabel("Email", { exact: true }).fill("alex@example.test");
  await page.getByLabel("Username", { exact: true }).fill("alex_test");
  await page.getByLabel("Password", { exact: true }).fill("Registration-test-42!");
  await page.getByLabel("Confirm password", { exact: true }).fill("Registration-test-42!");
  await page.getByLabel("I confirm that I am 18 years old or older.", { exact: true }).check();
}

test("public registration validates fields and confirmation before submission", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("tab", { name: "Register", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("First name", { exact: true })).toBeFocused();
  await expect(page.locator("form").getByRole("alert")).toHaveCount(6);
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

test("taken usernames show the orange warning and prevent account creation", async ({ page }) => {
  const creations: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/auth/register")) creations.push(request.url()); });
  await page.route("**/api/auth/username", route => route.fulfill({ status: 422, json: { status: "error", fieldErrors: { username: "register.usernameTaken" } } }));
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  const warning = page.getByRole("alert").filter({ hasText: "This username is taken. Choose another username." });
  await expect(warning).toBeVisible();
  await expect(warning).toHaveCSS("color", "rgb(251, 146, 60)");
  expect(creations).toEqual([]);
});

test("creation API errors show a red message and preserve the form", async ({ page }) => {
  await page.route("**/api/auth/username", route => route.fulfill({ json: { status: "success" } }));
  await page.route("**/api/auth/register", route => route.fulfill({ status: 503, json: { status: "error", message: "register.creationError" } }));
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  const error = page.getByRole("alert").filter({ hasText: "We couldn’t register your account." });
  await expect(error).toBeVisible();
  await expect(error).toHaveCSS("color", "rgb(248, 113, 113)");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue("alex_test");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("successful registration checks the username, clears the form and opens confirmation guidance", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.method() === "POST") requests.push(new URL(request.url()).pathname); });
  await page.route("**/api/auth/username", route => route.fulfill({ json: { status: "success" } }));
  await page.route("**/api/auth/register", route => route.fulfill({ json: { status: "success", message: "register.checkEmail" } }));
  await fillRegistration(page);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Registration successful" })).toBeVisible();
  await expect(page.getByText("Please check your email and click the confirmation link to activate your account. Welcome to the StudySpree family!", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  for (const label of ["First name", "Last name", "Email", "Username", "Password", "Confirm password"]) await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  await expect(page.getByLabel("I confirm that I am 18 years old or older.", { exact: true })).not.toBeChecked();
  expect(requests).toEqual(["/api/auth/username", "/api/auth/register"]);
});

test("all five registration dictionaries render their labels instead of translation keys", async ({ page }) => {
  await page.goto("/register");
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const dictionary = JSON.parse(readFileSync(new URL(`../src/translations/register/${locale}.json`, import.meta.url), "utf8")) as { register: Record<string, string> };
    await page.getByRole("combobox").selectOption(locale);
    await expect(page.getByLabel(dictionary.register.ageConfirmation, { exact: true })).toBeVisible();
    await expect(page.getByText(dictionary.register.ageHelp, { exact: true })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/\b(?:register|common|login|recovery)\.[A-Za-z]+/);
    await page.getByRole("button", { name: dictionary.register.submit, exact: true }).click();
    await expect(page.getByText(dictionary.register.ageRequired, { exact: true })).toBeVisible();
  }
});
