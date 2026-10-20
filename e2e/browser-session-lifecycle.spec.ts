import { expect, test } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

test("closing the study tab finishes it; reopening does not resume or count closed time", async ({ page, context }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const path = await startSession(page, undefined, null);
  await page.waitForTimeout(1200);
  await page.close({ runBeforeUnload: true });
  const reopened = await context.newPage();
  await reopened.goto("/study");
  await expect(reopened.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect.poll(() => reopened.evaluate(id => Boolean(JSON.parse(localStorage.getItem("ss_sessions") ?? "[]").find((s: { id: string }) => s.id === id)?.endedAt), path.split("/").at(-1))).toBe(true);
  const session = await reopened.evaluate(id => JSON.parse(localStorage.getItem("ss_sessions") ?? "[]").find((s: { id: string }) => s.id === id), path.split("/").at(-1));
  expect(session.endedAt).toBeTruthy();
  expect(session.endedReason).toBe("stopped_early");
  expect(session.actualSeconds).toBeGreaterThanOrEqual(1);
  const banked = session.actualSeconds;
  await reopened.waitForTimeout(1500);
  await reopened.reload();
  expect(await reopened.evaluate(id => JSON.parse(localStorage.getItem("ss_sessions") ?? "[]").find((s: { id: string }) => s.id === id)?.actualSeconds, session.id)).toBe(banked);
});

test("refresh and losing focus keep the same session running", async ({ page, context }) => {
  test.setTimeout(90_000);
  await signIn(page);
  const path = await startSession(page, undefined, null);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  await page.reload();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  await expect(page).toHaveURL(new URL(path, page.url()).href);
  const other = await context.newPage();
  await other.goto("about:blank"); await other.bringToFront();
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0]);
  expect(after.id).toBe(before.id); expect(after.startedAt).toBe(before.startedAt); expect(after.endedAt).toBeNull();
  await other.close(); await page.bringToFront();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
});
