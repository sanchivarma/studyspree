import { expect, test } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

test("the left chat icon opens a right drawer and Escape preserves the session", async ({ page }) => {
  await signIn(page); const path = await startSession(page);
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  const trigger = page.getByRole("button", { name: "Session chat", exact: true });
  expect((await trigger.boundingBox())!.x).toBeLessThan(60);
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Session chat", exact: true });
  await expect(drawer).toBeVisible();
  const box = await drawer.boundingBox();
  expect(box!.x + box!.width).toBe(await page.evaluate(() => innerWidth));
  await expect(drawer).toContainText("Chat with people is available in shared rooms.");
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(path);
  const current = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  expect(current.startedAt).toBe(original.startedAt);
  expect(current.endedAt).toBeNull();
});
