import { expect, test, type BrowserContext, type Response } from "@playwright/test";
import { navigationItems } from "../../src/lib/navigation/routes";
import { readFileSync } from "node:fs";
import { createLocalAccount } from "../supabase/localAccount";
import { expectFastAction } from "./budget";

function text(key: string) {
  const [namespace, name] = key.split(".");
  const dictionary = JSON.parse(readFileSync(new URL(`../../src/translations/${namespace}/en.json`, import.meta.url), "utf8")) as Record<string, Record<string, string>>;
  return dictionary[namespace][name];
}

let cookies: Awaited<ReturnType<BrowserContext["cookies"]>>;
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await createLocalAccount(page, "Performance reader");
    await expect(page.getByTestId("default-study-room")).toBeVisible();
    cookies = await context.cookies();
  } finally { await context.close(); }
});
test.beforeEach(async ({ page, context }) => {
  await context.addCookies(cookies);
  await page.goto("/");
  await expect(page.getByTestId("default-study-room")).toBeVisible();
});

const repositoryResponse = (response: Response, operation: string) =>
  new URL(response.url()).pathname === "/api/repository" && response.request().postDataJSON()?.op === operation;

for (const item of navigationItems) {
  test(`click ${item.id}: ready within two seconds`, async ({ page }, info) => {
    // Home must be reached from another screen, rather than clicking the current URL.
    if (item.id === "home") {
      await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Study", exact: true }).click();
      await expect(page.locator('section[aria-label="Start a study session"]')).toBeVisible();
    }
    if (!item.primary) await page.getByRole("button", { name: "More", exact: true }).click();
    const nav = page.getByRole("navigation", { name: item.primary ? "Main navigation" : "More", exact: true });
    const link = nav.getByRole("link", { name: text(item.labelKey), exact: true });
    await expectFastAction(info, `navigate ${item.id}`, remaining => link.click({ timeout: remaining() }), async remaining => {
      await expect(page).toHaveURL(new URL(item.href, page.url()).href, { timeout: remaining() });
      const selectors: Record<string, string> = {
        home: '[data-testid="default-study-room"]', study: 'section[aria-label="Start a study session"]',
        settings: 'input[autocomplete="nickname"]', stats: '[data-testid="stats-total"]',
        calendar: '[data-testid^="calendar-day-"]', contacts: '[data-testid="contacts-screen"]', profile: '[data-testid="profile-screen"]',
      };
      await expect(page.locator("main").locator(selectors[item.id] ?? "h1").first()).toBeVisible({ timeout: remaining() });
      await expect(page.locator("main").getByRole("status").filter({ hasText: new RegExp(`^(${text("community.loading")}|${text("common.working")}|${text("stats.loading")})$`) })).toHaveCount(0, { timeout: remaining() });
      await expect(page.locator("main").getByRole("alert")).toHaveCount(0, { timeout: remaining() });
      if (item.id === "settings") await expect(page.locator('input[autocomplete="nickname"]')).toBeEnabled({ timeout: remaining() });
      if (item.id === "study") await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled({ timeout: remaining() });
      if (item.id === "profile") await expect(page.locator("main").getByRole("heading", { name: "Performance reader", exact: true })).toBeVisible({ timeout: remaining() });
    });
  });
}

test("fresh companion selection and saved session complete within two seconds", async ({ page }, info) => {
  await page.goto("/study");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
  await expectFastAction(info, "open companion picker", remaining => page.getByRole("button", { name: "Choose companions", exact: true }).click({ timeout: remaining() }),
    remaining => expect(page.getByRole("dialog", { name: "Study companions", exact: true })).toBeVisible({ timeout: remaining() }));
  await expectFastAction(info, "open Virtual Partners", remaining => page.getByRole("button", { name: "Virtual partners", exact: true }).click({ timeout: remaining() }),
    remaining => expect(page.getByTestId("character-card-male-01")).toBeVisible({ timeout: remaining() }));
  const card = page.getByTestId("character-card-male-01");
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await expectFastAction(info, "select a fresh partner", remaining => card.click({ timeout: remaining() }),
    remaining => expect(card).toHaveAttribute("aria-pressed", "true", { timeout: remaining() }));
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  let saved: Promise<Response>;
  await expectFastAction(info, "Start with the selected partner", async remaining => {
    saved = page.waitForResponse(response => repositoryResponse(response, "start"), { timeout: remaining() });
    void saved.catch(() => undefined);
    await page.getByRole("button", { name: "Start", exact: true }).click({ timeout: remaining() });
  }, async remaining => {
    const response = await saved;
    expect(response.ok()).toBe(true);
    const session = await response.json() as { companions: { characterSlugs: string[] } };
    expect(session.companions.characterSlugs).toEqual(["male-01"]);
    await expect(page.getByTestId("character-loop-male-01")).toBeVisible({ timeout: remaining() });
  });
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
});

test("search opens and loads real results within two seconds", async ({ page }, info) => {
  let loaded: Promise<Response>;
  await expectFastAction(info, "open Search and load results", async remaining => {
    loaded = page.waitForResponse(response => new URL(response.url()).pathname === "/api/community" && response.request().postDataJSON()?.area === "search", { timeout: remaining() });
    void loaded.catch(() => undefined);
    await page.getByRole("button", { name: "Search StudySpree", exact: true }).click({ timeout: remaining() });
  }, async remaining => {
    expect((await loaded).ok()).toBe(true);
    await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toBeEnabled({ timeout: remaining() });
    await expect(page.getByRole("dialog").getByRole("status").filter({ hasText: text("community.loading") })).toHaveCount(0, { timeout: remaining() });
  });
});

test("Start and Finish reach their saved screens within two seconds", async ({ page }, info) => {
  await page.goto("/study?mode=solo");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
  let saved: Promise<Response>;
  try {
    await expectFastAction(info, "Start session", async remaining => {
      saved = page.waitForResponse(response => repositoryResponse(response, "start"), { timeout: remaining() });
      void saved.catch(() => undefined);
      await page.getByRole("button", { name: "Start", exact: true }).click({ timeout: remaining() });
    }, async remaining => {
      expect((await saved).ok()).toBe(true);
      await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: remaining() });
      await expect(page.getByTestId("session-time")).toBeVisible({ timeout: remaining() });
    });
    await expectFastAction(info, "Finish session", async remaining => {
      saved = page.waitForResponse(response => repositoryResponse(response, "finish"), { timeout: remaining() });
      void saved.catch(() => undefined);
      await page.getByRole("button", { name: "Finish", exact: true }).click({ timeout: remaining() });
    }, async remaining => {
      const response = await saved;
      expect(response.ok()).toBe(true);
      const result = await response.json() as { session: { endedAt: string | null } };
      expect(result.session.endedAt).not.toBeNull();
      await expect(page.getByTestId("complete-screen")).toBeVisible({ timeout: remaining() });
      await expect(page.getByTestId("banked-summary")).toBeVisible({ timeout: remaining() });
    });
  } finally {
    // Leave no running session if a latency assertion fails after a successful start.
    const finish = page.getByRole("button", { name: "Finish", exact: true });
    if (await finish.isVisible()) {
      await finish.click();
      await expect(page.getByTestId("complete-screen")).toBeVisible();
    }
  }
});

test("Settings toggle updates and saves within two seconds", async ({ page }, info) => {
  await page.goto("/settings");
  const control = page.getByRole("switch", { name: text("settings.showStreak"), exact: true });
  await expect(control).toBeEnabled();
  const checked = await control.getAttribute("aria-checked");
  let saved: Promise<Response>;
  await expectFastAction(info, "toggle Show streak and save", async remaining => {
    saved = page.waitForResponse(response => repositoryResponse(response, "updateProfile") && typeof response.request().postDataJSON()?.patch?.showStreak === "boolean", { timeout: remaining() });
    void saved.catch(() => undefined);
    await control.click({ timeout: remaining() });
  }, async remaining => {
    await expect(control).toHaveAttribute("aria-checked", checked === "true" ? "false" : "true", { timeout: remaining() });
    const response = await saved;
    expect(response.ok()).toBe(true);
    const profile = await response.json() as { showStreak: boolean };
    expect(profile.showStreak).toBe(checked !== "true");
  });
});

test("Virtual and People visibility controls respond within two seconds", async ({ page }, info) => {
  await page.goto("/study");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
  for (const mode of ["Virtual partners", "People"]) {
    await page.getByRole("button", { name: "Choose companions", exact: true }).click();
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Study companions", exact: true })).toBeHidden();
    for (const visibility of ["Public", "Private"]) {
      const radio = page.getByRole("radio", { name: visibility, exact: true });
      await expectFastAction(info, `${mode}: select ${visibility}`, remaining => radio.check({ timeout: remaining() }), async remaining => {
        await expect(radio).toBeChecked({ timeout: remaining() });
        await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled({ timeout: remaining() });
      });
    }
  }
});
