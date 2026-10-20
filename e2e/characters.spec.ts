import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

async function choosePartners(page: import("@playwright/test").Page) {
  await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("character-card-male-01").click();
  await page.getByTestId("character-card-female-04").click();
  await expect(page.getByTestId("character-card-male-01")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).companionPreferences)).toEqual({ mode: "characters", characterSlugs: ["male-01", "female-04"] });
}

test("character selection persists, restores after refresh, and never requests a camera", async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const state = window as unknown as Window & { __cameraRequests: number };
    state.__cameraRequests = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: () => { state.__cameraRequests++; throw new Error("Unexpected camera request in character-only session"); } });
  });
  await signIn(page);
  await choosePartners(page);
  await page.getByRole("button", { name: "Switch theme", exact: true }).click();
  await page.getByTestId("theme-card-night-shift").click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  await expect(page.getByTestId("session-companions").getByRole("img")).toHaveCount(2);
  expect(await page.evaluate(() => (window as unknown as Window & { __cameraRequests: number }).__cameraRequests)).toBe(0);
  await page.reload();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  expect(restored).toEqual(session);
  await expect(page.getByTestId("theme-scene").getByTestId("scene-video")).toHaveAttribute("data-theme", "night-shift");
  await expect(page.getByTestId("session-companions").getByRole("img")).toHaveCount(2);
  await page.mouse.move(20, 20);
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByTestId("character-card-male-02").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByTestId("session-companions").getByRole("img")).toHaveCount(3);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(session.startedAt);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Window & { __cameraRequests: number }).__cameraRequests)).toBe(0);
});

test("reduced-motion companions render static posters with no animation requests", async ({ page }) => {
  await signIn(page);
  const gifs: string[] = [];
  page.on("request", request => { if (/\/characters\/.*\.(gif|webm|mp4)$/.test(request.url())) gifs.push(request.url()); });
  await choosePartners(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-companions")).toBeVisible();
  await expect(page.getByTestId("character-animation")).toHaveCount(0);
  expect(gifs).toEqual([]);
});

test("missing long video and GIF fall back to the poster and Finish remains usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page);
  await page.route("**/characters/*/study-*.gif", route => route.abort());
  await page.route("**/characters/*/study-*.webm", route => route.abort());
  await page.route("**/characters/*/study-*.mp4", route => route.abort());
  await choosePartners(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const loop = page.getByTestId("session-companions").getByTestId("character-loop-male-01");
  await expect(loop).toHaveAttribute("data-animated", "false");
  await expect(loop.locator("img")).toHaveCount(1);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
});

test("GIFs unmount when the document is hidden and character cards support arrows", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByTestId("character-card-male-01").click();
  await page.getByTestId("character-card-male-01").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("character-card-male-03")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-companions").getByTestId("character-animation")).toHaveCount(2);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("character-animation")).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("session-companions").getByTestId("character-animation")).toHaveCount(2);
});
