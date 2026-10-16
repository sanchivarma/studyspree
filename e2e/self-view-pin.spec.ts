import { expect, test } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });
test("local camera can lead the character grid without another permission request", async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    Object.assign(window, { cameraRequests: 0 });
    navigator.mediaDevices.getUserMedia = constraints => {
      (window as unknown as { cameraRequests: number }).cameraRequests++;
      return original(constraints);
    };
  });
  await signIn(page); await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await page.getByRole("button", { name: "Pin my video first", exact: true }).click();
  await expect(page.getByTestId("self-view-pinned")).toBeVisible();
  await expect(page.getByTestId("session-companions").locator(":scope > *").first()).toHaveAttribute("data-testid", "self-view-pinned");
  await expect.poll(() => page.getByTestId("local-camera-video").evaluate(video => (video as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Unpin my video", exact: true }).click();
  await expect(page.getByTestId("self-view")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { cameraRequests: number }).cameraRequests)).toBe(1);
});
