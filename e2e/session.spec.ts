import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { signIn, freezeClock, startSession, settleClock } from "./sessionFixtures";

test("Study starts a persisted timer with its task and Finish banks elapsed time", async ({ page }) => {
  await signIn(page);
  await freezeClock(page);
  const path = await startSession(page, "Read chapter 3 & take notes");
  await expect(page.getByTestId("session-screen")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByTestId("auth-feedback")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByTestId("session-time")).toHaveText("5:00 left");
  await expect(page.getByText("Read chapter 3 & take notes", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sound" })).toBeEnabled();
  await page.screenshot({ path: "test-results/session-desktop.png" });
  let hasDialog = false;
  page.on("dialog", async (dialog) => { hasDialog = true; await dialog.dismiss(); });
  await page.clock.runFor(10_000);
  await page.mouse.move(10, 10);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  // A newly added route may need its first development compilation.
  await settleClock(page, "complete-screen");
  await expect(page).toHaveURL(new RegExp(`${path}/complete$`), { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "You started. That was the hard part.", exact: true })).toBeVisible();
  await expect(page.getByTestId("banked-summary")).toHaveText("+10s this session · 0h 0m today");
  expect(hasDialog).toBe(false);
});

test("five seconds of inactivity hides controls, dims the progress bar and input restores them", async ({ page }) => {
  await signIn(page);
  await freezeClock(page);
  const path = await startSession(page, "Reading");
  const screen = page.getByTestId("session-screen");
  const ring = page.getByRole("progressbar");
  const controls = page.getByRole("button", { name: "Finish", exact: true });
  const details = page.getByTestId("session-details");
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await page.mouse.move(10, 10);
  await page.clock.fastForward(4999);
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await page.clock.fastForward(1);
  await expect(screen).toHaveAttribute("data-controls-visible", "false");
  await expect(controls).toHaveCSS("opacity", "0");
  await expect(details).toHaveCSS("opacity", "0");
  await expect(ring.locator("..")).toHaveCSS("opacity", "0.4");
  await expect(screen).toHaveCSS("cursor", "none");
  await expect(page.getByRole("button", { name: "Choose companions", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sound", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "My status", exact: true })).toBeVisible();

  await page.mouse.move(20, 20);
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await expect(ring.locator("..")).toHaveCSS("opacity", "1");
  await page.clock.fastForward(5000);
  await expect(screen).toHaveAttribute("data-controls-visible", "false");
  await screen.dispatchEvent("touchstart");
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await page.clock.fastForward(5000);
  await expect(screen).toHaveAttribute("data-controls-visible", "false");
  await page.keyboard.press("a");
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await expect(controls).toHaveCSS("opacity", "1");
  await page.clock.fastForward(5000);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Choose companions", exact: true })).toBeFocused();
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await expect(page.getByTestId("session-time")).toHaveText("4:40 left");
  await page.clock.fastForward(5000);
  await page.keyboard.press("Escape");
  await settleClock(page, "complete-screen");
  await expect(page).toHaveURL(new RegExp(`${path}/complete$`));
});

test("phone layout keeps the camera and Finish separate and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await signIn(page);
  await startSession(page);
  const ring = page.getByRole("progressbar");
  const camera = page.getByTestId("self-view");
  const finish = page.getByRole("button", { name: "Finish", exact: true });
  await expect(ring).toBeVisible();
  expect((await ring.boundingBox())!.height).toBe(4);
  const cameraBox = await camera.boundingBox();
  const finishBox = await finish.boundingBox();
  expect(cameraBox).toMatchObject({ width: 44, height: 44 });
  expect(cameraBox!.y + cameraBox!.height).toBeLessThanOrEqual(finishBox!.y);
  await expect(ring).toHaveCSS("transition-duration", "0s");
  await expect(page.getByTestId("session-details").locator("p")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/session-mobile.png" });
});

test("session controls are translated in every supported language", async ({ page }) => {
  await signIn(page);
  await freezeClock(page);
  const path = await startSession(page);
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { session } = JSON.parse(readFileSync(new URL(`../src/translations/session/${locale}.json`, import.meta.url), "utf8")) as { session: { finish: string; remaining: string; camera: string; sound: string } };
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto(path);
    await settleClock(page, "session-screen");
    await expect(page.getByRole("button", { name: session.finish, exact: true })).toBeVisible();
    await expect(page.getByTestId("session-time")).toHaveText(session.remaining.replace("{time}", "5:00"));
    await expect(page.getByTestId("self-view")).toBeVisible();
    await expect(page.getByRole("button", { name: session.sound, exact: true })).toBeVisible();
  }
});
