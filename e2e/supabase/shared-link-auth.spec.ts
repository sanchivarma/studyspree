import { expect, test } from "@playwright/test";
import { createLocalAccount } from "./localAccount";

test("a signed-out shared-room link survives magic-link sign-in and onboarding", async ({ page, browser }) => {
  test.setTimeout(120000);
  await page.route("**/api/rooms/token", route => route.fulfill({ status: 503, json: {} }));
  await createLocalAccount(page, "Shared link host");
  const response = await page.request.post("/api/repository", { data: { op: "start", input: {
    plannedMinutes: 5, themeSlug: "rain-desk", task: null, title: "Shared reading", rules: null,
    visibility: "public", companions: { mode: "solo", characterSlugs: [] },
  } } });
  expect(response.ok()).toBe(true); const session = await response.json();
  const roomPath = `/rooms/${session.roomId}`;
  await page.goto(roomPath);
  const guestContext = await browser.newContext();
  try {
    const guest = await guestContext.newPage(); await guest.route("**/api/rooms/token", route => route.fulfill({ status: 503, json: {} }));
    await guest.goto(roomPath); await expect(guest).toHaveURL(/\/login$/);
    await createLocalAccount(guest, "Shared link guest", roomPath);
    await expect(guest.getByRole("heading", { name: "Shared reading", exact: true })).toBeVisible();
    expect((await guest.context().cookies()).some(cookie => cookie.name === "ss_auth_return" && cookie.value !== "")).toBe(false);
  } finally {
    await guestContext.close();
    await page.request.post("/api/repository", { data: { op: "finish", id: session.id, reason: "stopped_early" } });
  }
});
