import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Dictionary } from "../src/translations";

const locales = ["en", "de", "fr", "pl", "it"] as const;
const namespaces = ["common", "login", "register", "recovery", "home", "study", "session"];
const dictionaries = Object.fromEntries(locales.map((locale) => [locale,
  Object.assign({}, ...namespaces.map((namespace) => JSON.parse(readFileSync(new URL(`../src/translations/${namespace}/${locale}.json`, import.meta.url), "utf8")))),
])) as Record<(typeof locales)[number], Dictionary>;

test("the root loads account access without session controls", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("language-globe")).toBeVisible();
  await expect(page.getByRole("heading", { name: dictionaries.en.common.tagline })).toBeVisible();
  await expect(page.getByRole("tab", { name: dictionaries.en.login.title })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "5 min", exact: true })).toHaveCount(0);
});

test("all five languages update forms, accessibility labels and saved preferences", async ({ page }) => {
  await page.goto("/");
  for (const locale of locales) {
    const text = dictionaries[locale];
    await page.getByRole("combobox").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { name: text.common.tagline })).toBeVisible();
    await page.getByRole("tab", { name: text.register.title, exact: true }).click();
    for (const label of [text.common.firstName, text.common.lastName, text.common.email, text.common.username, text.common.password]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: text.common.google })).toBeVisible();
    await expect(page.getByRole("button", { name: text.common.facebook })).toBeVisible();
    await page.getByRole("tab", { name: text.login.title, exact: true }).click();
    await page.getByRole("button", { name: text.login.forgotPassword }).click();
    await expect(page.getByRole("heading", { name: text.recovery.title })).toBeVisible();
    await page.getByRole("button", { name: text.recovery.backLogin }).click();
    await expect.poll(async () => (await page.context().cookies()).find((cookie) => cookie.name === "ss_locale")?.value).toBe(locale);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  }
});

test("tabs support keyboard navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: dictionaries.en.login.title, exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: dictionaries.en.register.title, exact: true })).toBeFocused();
  await expect(page.getByLabel(dictionaries.en.common.firstName, { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: dictionaries.en.login.title, exact: true })).toBeFocused();
});

test("signed-out sessions cannot access Home or Study", async ({ page }) => {
  for (const path of ["/home", "/study", "/session/demo"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("tab", { name: dictionaries.en.login.title, exact: true })).toBeVisible();
  }
});

test("registration fits a phone viewport in every language", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  for (const locale of locales) {
    await page.getByRole("combobox").selectOption(locale);
    await page.getByRole("tab", { name: dictionaries[locale].register.title, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("button", { name: dictionaries[locale].register.submit, exact: true })).toBeVisible();
  }
});


test("development login opens Home and keeps session controls on Study", async ({ page }) => {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const value = (key: string) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  const username = value("DEV_ADMIN_USERNAME");
  expect(username).toBeTruthy();
  await page.goto("/");
  await page.getByLabel(dictionaries.en.common.username, { exact: true }).fill(username);
  await page.getByLabel(dictionaries.en.common.password, { exact: true }).fill(value("DEV_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: dictionaries.en.login.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByTestId("auth-feedback").getByRole("status")).toHaveText(dictionaries.en.login.success);
  await expect(page.getByRole("heading")).toContainText(username);
  await expect(page.getByRole("button", { name: /^5 min/ })).toHaveCount(0);
  await page.getByRole("link", { name: dictionaries.en.home.studyLink }).click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByRole("button", { name: /^5 min/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  await expect(page.getByRole("button", { name: "25 min", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/home");
  await page.getByRole("button", { name: dictionaries.en.common.logout, exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/study");
  await expect(page).toHaveURL(/\/$/);
});

test("wrong passwords show a visible localized error without signing in", async ({ page }) => {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const username = env.match(/^DEV_ADMIN_USERNAME=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  expect(username).toBeTruthy();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  for (const locale of locales) {
    const text = dictionaries[locale];
    await page.getByRole("combobox").selectOption(locale);
    await page.getByLabel(text.common.username, { exact: true }).fill(username);
    await page.getByLabel(text.common.password, { exact: true }).fill("incorrect-test-password");
    await page.getByRole("button", { name: text.login.submit, exact: true }).click();
    const feedback = page.getByTestId("auth-feedback");
    await expect(feedback.getByRole("alert")).toHaveText(text.login.invalidCredentials);
    await expect(page).toHaveURL(/\/$/);
    expect((await page.context().cookies()).some((cookie) => cookie.name === "ss_dev_admin")).toBe(false);
    const box = await feedback.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(568);
    await feedback.getByRole("button", { name: text.common.dismiss }).click();
    await expect(feedback).toHaveCount(0);
  }
});
