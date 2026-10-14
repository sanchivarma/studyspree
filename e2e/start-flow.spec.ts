import { expect, test } from "@playwright/test";
import { freezeClock, signIn, startSession, settleClock } from "./sessionFixtures";

test("cold Study opens a running session within twenty seconds with one saved start", async ({ page }) => {
  await signIn(page);
  const messages: string[] = [];
  page.on("console", (message) => { if (message.type() === "debug") messages.push(message.text()); });
  const mounted = Date.now();
  await page.goto("/study");
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect(start).toBeEnabled();
  await start.evaluate((button) => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  expect(Date.now() - mounted).toBeLessThan(20_000);
  expect(new URL(page.url()).search).toBe("");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).length)).toBe(1);
  expect(messages.some((message) => /^time_to_start_ms \d+/.test(message))).toBe(true);
});

test("refresh resumes the countdown and Finish banks ten seconds without URL totals", async ({ page }) => {
  await signIn(page); await freezeClock(page);
  const path = await startSession(page);
  await page.clock.runFor(10_000);
  await page.reload();
  await settleClock(page, "session-screen");
  await expect(page.getByTestId("session-time")).toHaveText("4:50 left");
  await page.keyboard.press("Escape");
  await settleClock(page, "complete-screen");
  await expect(page).toHaveURL(new RegExp(`${path}/complete$`));
  await expect(page.getByTestId("banked-summary")).toHaveText("+10s this session · 0h 0m today");
  await page.reload();
  await settleClock(page, "complete-screen");
  await expect(page.getByTestId("banked-summary")).toHaveText("+10s this session · 0h 0m today");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0])).toMatchObject({ actualSeconds: 10, endedReason: "stopped_early" });
  expect(new URL(page.url()).search).toBe("");
});

test("a second tab opened on root resumes the active session and sees Finish", async ({ page, context }) => {
  await signIn(page);
  const path = await startSession(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other).toHaveURL(new RegExp(`${path}$`), { timeout: 15000 });
  await expect(other.getByTestId("session-screen")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`${path}/complete$`));
  await expect(other).toHaveURL(new RegExp(`${path}/complete$`));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).length)).toBe(1);
  await other.close();
});

test("five-minute expiry completes once and a dev clock jump survives reload", async ({ page }) => {
  await signIn(page); await freezeClock(page);
  const first = await startSession(page);
  await page.clock.fastForward(300_000);
  await settleClock(page, "complete-screen");
  await expect(page).toHaveURL(new RegExp(`${first}/complete$`));
  await expect(page.getByTestId("banked-summary")).toHaveText("+5m this session · 0h 5m today");
  await page.getByRole("link", { name: "Start another", exact: true }).click();
  await page.goto("/study");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await settleClock(page, "session-screen");
  const second = new URL(page.url()).pathname;
  await page.evaluate(() => localStorage.setItem("ss_dev_clock_offset_ms", "600000"));
  await page.reload();
  await settleClock(page, "complete-screen");
  await expect(page).toHaveURL(new RegExp(`${second}/complete$`));
  await expect(page.getByTestId("banked-summary")).toHaveText("+10m this session · 0h 15m today");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).map((session: { actualSeconds: number; endedReason: string }) => [session.actualSeconds, session.endedReason]))).toEqual([[300, "completed"], [600, "completed"]]);
});

test("Open counts up, stays active, and is remembered after Finish", async ({ page }) => {
  await signIn(page); await freezeClock(page);
  await startSession(page, undefined, null);
  await expect(page.getByTestId("session-time")).toHaveText("0:00 elapsed");
  await page.clock.fastForward(3 * 3600_000);
  await expect(page.getByTestId("session-time")).toHaveText("3:00:00 elapsed");
  await page.keyboard.press("Escape");
  await settleClock(page, "complete-screen");
  await expect(page.getByTestId("banked-summary")).toHaveText("+180m this session · 3h 0m today");
  await page.getByRole("link", { name: "Start another", exact: true }).click();
  await page.goto("/study");
  await expect.poll(async () => {
    await page.clock.runFor(1);
    return page.getByRole("button", { name: "Open", exact: true }).getAttribute("aria-pressed");
  }).toBe("true");
});

test("saved profile and previous duration are read without overriding a user choice", async ({ page }) => {
  await signIn(page);
  await page.evaluate(() => {
    const endedAt = new Date().toISOString();
    const startedAt = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem("ss_profile", JSON.stringify({ displayName: "Alex", selectedCharacter: "night-shift", timezone: "Europe/Berlin", showStreak: false, reduceMotion: false, webcamEnabled: false, ambienceEnabled: false }));
    localStorage.setItem("ss_sessions", JSON.stringify([{ id: "previous", startedAt, endedAt, plannedMinutes: 15, actualSeconds: 60, endedReason: "completed", characterSlug: "rain-desk", localDate: startedAt.slice(0, 10), task: null }]));
  });
  await page.goto("/study");
  await expect(page.getByRole("button", { name: "15 min", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Alex\./)).toBeVisible();
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  await page.getByRole("textbox").fill("Notes");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/study$/);
  await page.getByRole("textbox").evaluate((input) => (input as HTMLInputElement).blur());
  await page.keyboard.press("Space");
  await expect(page.getByTestId("session-screen")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!).at(-1))).toMatchObject({ plannedMinutes: 25, characterSlug: "night-shift", task: "Notes" });
});

test("invalid session routes return through root", async ({ page }) => {
  await signIn(page);
  await page.goto("/session/unknown");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/session/unknown/complete");
  await expect(page).toHaveURL(/\/home$/);
});
