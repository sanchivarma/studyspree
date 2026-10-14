import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
const controlledPages = new WeakSet<Page>();

export async function signIn(page: Page) {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const value = (key: string) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill(value("DEV_ADMIN_USERNAME"));
  await page.getByLabel("Password", { exact: true }).fill(value("DEV_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // The development server may compile the authenticated route on sign-in.
  await expect(page).toHaveURL(/\/home$/, { timeout: 15000 });
}

export async function freezeClock(page: Page) {
  await page.clock.install({ time: new Date("2026-10-13T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-13T12:00:01Z"));
  controlledPages.add(page);
}

export async function settleClock(page: Page, testId: string, stepMs = 1) {
  // Query notifications need a small clock step. Start navigation also needs
  // a browser frame; keep animation tests on 1ms steps for precise samples.
  await expect.poll(async () => {
    await page.clock.runFor(stepMs);
    return page.getByTestId(testId).isVisible();
  }, { timeout: 15000 }).toBe(true);
}

export async function startSession(page: Page, task?: string, minutes: number | null = 5) {
  await page.goto("/study");
  if (minutes !== 5) await page.getByRole("button", { name: minutes === null ? "Open" : `${minutes} min`, exact: true }).click();
  if (task) await page.getByRole("textbox").fill(task);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  if (controlledPages.has(page)) await settleClock(page, "session-screen", 16);
  else await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  return new URL(page.url()).pathname;
}

export async function seedCompletion(page: Page) {
  await page.evaluate(() => {
    const timestamp = Date.now();
    const durations = [21600, 21600, 21600, 21600, 21600, 21600, 19200, 2700, 1500];
    const sessions = durations.map((actualSeconds, index) => {
      const earlierDay = new Date(timestamp); earlierDay.setUTCDate(earlierDay.getUTCDate() - (7 - index));
      const startedMs = index < 7 ? earlierDay.getTime() : timestamp - (index === 7 ? 4200 : 1500) * 1000;
      const startedAt = new Date(startedMs).toISOString();
      return { id: index === 8 ? "complete-test" : `history-${index}`, startedAt,
        endedAt: new Date(startedMs + actualSeconds * 1000).toISOString(), plannedMinutes: 25, actualSeconds,
        endedReason: "completed", themeSlug: "rain-desk", localDate: startedAt.slice(0, 10), task: null };
    });
    localStorage.setItem("ss_sessions", JSON.stringify(sessions));
    localStorage.setItem("ss_active", "null");
  });
}
