import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const value = (key: string) => env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill(value("DEV_ADMIN_USERNAME"));
  await page.getByLabel("Password", { exact: true }).fill(value("DEV_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test("Study opens the static session with the task and Finish goes directly to Complete", async ({ page }) => {
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("textbox").fill("Read chapter 3 & take notes");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByTestId("auth-feedback")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "62");
  await expect(page.getByText("15:23 left", { exact: true })).toBeVisible();
  await expect(page.getByText("Read chapter 3 & take notes", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sound" })).toHaveAttribute("aria-disabled", "true");
  await page.screenshot({ path: "test-results/session-desktop.png" });
  let hasDialog = false;
  page.on("dialog", async (dialog) => { hasDialog = true; await dialog.dismiss(); });
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  // A newly added route may need its first development compilation.
  await expect(page).toHaveURL(/\/session\/demo\/complete$/, { timeout: 15000 });
  expect(hasDialog).toBe(false);
});

test("five seconds of inactivity hides controls, dims the ring and input restores them", async ({ page }) => {
  await signIn(page);
  await page.clock.install({ time: new Date("2026-10-13T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-13T12:00:01Z"));
  await page.goto("/session/demo?task=Reading");
  const screen = page.getByTestId("session-screen");
  const ring = page.getByRole("progressbar");
  const controls = page.getByTestId("session-controls");
  const details = page.getByTestId("session-details");
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await page.mouse.move(10, 10);
  await page.clock.fastForward(4999);
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await page.clock.fastForward(1);
  await expect(screen).toHaveAttribute("data-controls-visible", "false");
  await expect(controls).toHaveCSS("opacity", "0");
  await expect(details).toHaveCSS("opacity", "0");
  await expect(ring).toHaveCSS("opacity", "0.4");
  await expect(screen).toHaveCSS("cursor", "none");

  await page.mouse.move(20, 20);
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await expect(ring).toHaveCSS("opacity", "1");
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
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeFocused();
  await expect(screen).toHaveAttribute("data-controls-visible", "true");
  await expect(page.getByText("15:23 left", { exact: true })).toHaveText("15:23 left");
  await page.clock.fastForward(5000);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/session\/demo\/complete$/);
});

test("phone layout keeps the camera and Finish separate and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await signIn(page);
  await page.goto("/session/demo");
  const ring = page.getByRole("progressbar");
  const camera = page.getByText("camera", { exact: true }).locator("..");
  const finish = page.getByRole("button", { name: "Finish", exact: true });
  await expect(ring).toBeVisible();
  expect(await ring.boundingBox()).toMatchObject({ width: 120, height: 120 });
  const cameraBox = await camera.boundingBox();
  const finishBox = await finish.boundingBox();
  expect(cameraBox).toMatchObject({ width: 120, height: 90 });
  expect(cameraBox!.y + cameraBox!.height).toBeLessThan(finishBox!.y);
  await expect(ring).toHaveCSS("transition-duration", "0s");
  await expect(page.getByTestId("session-details").locator("p")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/session-mobile.png" });
});

test("session controls are translated in every supported language", async ({ page }) => {
  await signIn(page);
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { session } = JSON.parse(readFileSync(new URL(`../src/translations/session/${locale}.json`, import.meta.url), "utf8")) as { session: { finish: string; remaining: string; camera: string; sound: string } };
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto("/session/demo");
    await expect(page.getByRole("button", { name: session.finish, exact: true })).toBeVisible();
    await expect(page.getByText(session.remaining.replace("{time}", "15:23"), { exact: true })).toBeVisible();
    await expect(page.getByText(session.camera, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: session.sound })).toBeVisible();
  }
});
