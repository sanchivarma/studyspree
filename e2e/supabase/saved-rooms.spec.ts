import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createLocalAccount } from "./localAccount";
import { expectFastAction } from "../performance/budget";

test.setTimeout(120_000);

async function createRoom(page: Page, name: string, kind: string, info: TestInfo, configure?: () => Promise<void>) {
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Room name", { exact: true }).fill(name);
  await sheet.getByRole("radio", { name: kind, exact: true }).check();
  await configure?.();
  await expectFastAction(info, `create ${kind}`, remaining => sheet.getByRole("button", { name: "Create room", exact: true }).click({ timeout: remaining() }), async remaining => {
    await expect(page).toHaveURL(/\/rooms\/[\da-f-]+$/, { timeout: remaining() });
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: remaining() });
  });
  return new URL(page.url()).pathname;
}

test("Dashboard copy, saved Solo view, fresh login and confirmed deletion", async ({ page, browser }, info) => {
  await createLocalAccount(page, "Solo room reader");
  await expect(page.getByRole("link", { name: "Let's Study", exact: true })).toBeVisible();
  await expect(page.getByText("Big goals start with showing up", { exact: false })).toHaveCount(0);
  await expect(page.getByTestId("default-study-room")).toBeVisible();
  await expect(page.getByTestId("default-study-room").getByRole("heading")).toHaveText("StudySpree General Study Room I");
  await page.getByTestId("default-study-room").getByText("Study together, protect and respect each other's privacy", { exact: true }).click();
  await expect(page.getByText("Camera sharing is preferred when joining.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("default-study-room").getByTestId("remove-saved-room")).toHaveCount(0);
  const name = `Quiet desk ${crypto.randomUUID()}`;
  const path = await createRoom(page, name, "Permanent · Solo", info, async () => {
    await page.getByRole("dialog").getByRole("combobox", { name: "Study table", exact: true }).selectOption("none");
    await page.getByRole("dialog").getByRole("combobox", { name: "Window view", exact: true }).selectOption("magic-academy");
  });
  await expectFastAction(info, "open saved Solo session", remaining => page.getByRole("button", { name: "Let's Study", exact: true }).click({ timeout: remaining() }), async remaining => {
    await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: remaining() });
    await expect(page.getByTestId("solo-study-scene")).toHaveAttribute("data-desk", "none", { timeout: remaining() });
    await expect(page.getByTestId("solo-study-scene")).toHaveAttribute("data-window", "magic-academy", { timeout: remaining() });
  });
  // Use the real Settings transport while the room is active; its view must update.
  const updated = await page.request.post("/api/repository", { data: { op: "updateProfile", patch: { soloScene: { desk: "pirate", window: "waterfall" } } } });
  expect(updated.ok()).toBe(true);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page).toHaveURL(/\/complete$/);
  const cookies = await page.context().cookies();
  const fresh = await browser.newContext();
  try {
    await fresh.addCookies(cookies);
    const returning = await fresh.newPage();
    await returning.goto("/");
    const tile = returning.getByTestId("saved-study-room").filter({ has: returning.getByRole("heading", { name, exact: true }) });
    await expect(tile).toBeVisible();
    const cross = await tile.getByTestId("remove-saved-room").boundingBox();
    const card = await tile.boundingBox();
    expect(cross!.x - card!.x).toBeLessThan(10);
    expect(cross!.y - card!.y).toBeLessThan(10);
    await returning.screenshot({ path: ".tmp/saved-rooms-dashboard.png", fullPage: true });
    await tile.getByRole("link", { name: "Join", exact: true }).click();
    await returning.getByRole("button", { name: "Let's Study", exact: true }).click();
    await expect(returning.getByTestId("solo-study-scene")).toHaveAttribute("data-desk", "pirate");
    await expect(returning.getByTestId("solo-study-scene")).toHaveAttribute("data-window", "waterfall");
    await returning.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(returning).toHaveURL(/\/complete$/);
    await returning.goto("/");
    await tile.getByRole("button", { name: `Delete ${name}`, exact: true }).click();
    await returning.getByRole("alertdialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(tile).toBeVisible();
    await tile.getByRole("button", { name: `Delete ${name}`, exact: true }).click();
    await expectFastAction(info, "delete saved room", remaining => returning.getByRole("alertdialog").getByRole("button", { name: "Delete room", exact: true }).click({ timeout: remaining() }), async remaining => {
      await expect(tile).toHaveCount(0, { timeout: remaining() });
    });
    await returning.goto(path);
    await expect(returning.getByRole("heading", { name: "Room with this ID is deleted.", exact: true })).toBeVisible();
  } finally { await fresh.close(); }
});

test("Shared room keeps virtual partners and joined people across sessions; deleted ID is explicit to a guest", async ({ page, browser }, info) => {
  // Plain LAN HTTP has secure random bytes, but no randomUUID API.
  await page.addInitScript(() => Object.defineProperty(window.crypto, "randomUUID", { value: undefined, configurable: true }));
  await createLocalAccount(page, "Shared room admin");
  const name = `Shared desk ${crypto.randomUUID()}`;
  const path = await createRoom(page, name, "Permanent · Shared", info, async () => {
    await expect(page.getByTestId("character-picker").locator('[aria-pressed="true"]')).toHaveCount(0);
    await page.getByTestId("character-card-male-01").click();
  });
  const guestContext = await browser.newContext();
  await guestContext.addInitScript(() => Object.defineProperty(window.crypto, "randomUUID", { value: undefined, configurable: true }));
  try {
    const guest = await guestContext.newPage();
    await createLocalAccount(guest, "Shared room guest");
    await expect(guest.getByTestId("saved-study-room").filter({ hasText: name })).toHaveCount(0);
    await guest.getByLabel("Room ID", { exact: true }).fill(path.split("/").at(-1)!);
    await guest.getByRole("button", { name: "Open room", exact: true }).click();
    await expect(guest.getByRole("heading", { name, exact: true })).toBeVisible();
    await expectFastAction(info, "join permanent Shared room", remaining => guest.getByRole("button", { name: "Join", exact: true }).click({ timeout: remaining() }), async remaining => {
      await expect(guest.getByTestId("room-side-controls")).toBeVisible({ timeout: remaining() });
      await expect(guest.getByTestId("room-video-grid").getByTestId("character-loop-male-01")).toBeVisible({ timeout: remaining() });
    });
    await guest.getByRole("button", { name: "Session chat", exact: true }).click();
    await guest.getByLabel("Message", { exact: true }).fill("LAN-compatible room chat");
    await guest.getByRole("button", { name: "Send", exact: true }).click();
    await expect(guest.getByTestId("room-chat").getByText("LAN-compatible room chat", { exact: true })).toBeVisible();
    await guest.keyboard.press("Escape");
    await guest.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(guest).toHaveURL(/\/complete$/);
    await guest.goto("/");
    const tile = guest.getByTestId("saved-study-room").filter({ hasText: name });
    await expect(tile).toBeVisible();
    await expect(tile.getByRole("button", { name: `Delete ${name}`, exact: true })).toHaveCount(0);
    await tile.getByRole("button", { name: `Remove ${name} from saved rooms`, exact: true }).click();
    await expect(guest.getByRole("alertdialog")).toContainText("The shared room stays available to its creator and other people.");
    await guest.getByRole("alertdialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(tile).toBeVisible();
    await tile.getByRole("button", { name: `Remove ${name} from saved rooms`, exact: true }).click();
    await expectFastAction(info, "remove guest saved room", remaining => guest.getByRole("alertdialog").getByRole("button", { name: "Remove from saved rooms", exact: true }).click({ timeout: remaining() }), async remaining => {
      await expect(tile).toHaveCount(0, { timeout: remaining() });
    });
    await guest.reload();
    await expect(guest.getByTestId("default-study-room")).toBeVisible();
    await expect(tile).toHaveCount(0);
    await page.goto("/");
    const ownerTile = page.getByTestId("saved-study-room").filter({ hasText: name });
    await expect(ownerTile).toBeVisible();
    await guest.goto(path);
    await expect(guest.getByRole("heading", { name, exact: true })).toBeVisible();
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(guest.getByTestId("room-side-controls")).toBeVisible();
    await guest.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(guest).toHaveURL(/\/complete$/);
    await guest.goto("/");
    await expect(tile).toBeVisible();
    await tile.getByRole("link", { name: "Join", exact: true }).click();
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(guest.getByTestId("room-side-controls")).toBeVisible();
    await ownerTile.getByRole("button", { name: `Delete ${name}`, exact: true }).click();
    await expect(page.getByRole("alertdialog")).toContainText("closes shared access");
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete room", exact: true }).click();
    await expect(ownerTile).toHaveCount(0);
    await expect(guest.getByRole("heading", { name: "Room with this ID is deleted.", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(guest.getByTestId("room-side-controls")).toHaveCount(0);
    await guest.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(guest).toHaveURL(/\/complete$/);
    await guest.goto(path);
    await expect(guest.getByRole("heading", { name: "Room with this ID is deleted.", exact: true })).toBeVisible();
    await expect(guest.getByRole("button", { name: "Join", exact: true })).toHaveCount(0);
    await guest.goto("/");
    await expect(guest.getByTestId("default-study-room")).toBeVisible();
    await expect(tile).toHaveCount(0);
  } finally { await guestContext.close(); }
});

test("Temporary room starts empty and closes with its creator session", async ({ page }, info) => {
  await createLocalAccount(page, "Temporary room reader");
  const name = `Temporary desk ${crypto.randomUUID()}`;
  const path = await createRoom(page, name, "Temporary · this session", info);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByTestId("room-side-controls")).toBeVisible();
  await expect(page.getByTestId("room-video-grid").locator('[data-testid^="character-loop-"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page).toHaveURL(/\/complete$/);
  await page.goto("/");
  await expect(page.getByTestId("default-study-room")).toBeVisible();
  await expect(page.getByTestId("saved-study-room").filter({ hasText: name })).toHaveCount(0);
  await page.goto(path);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join", exact: true })).toHaveCount(0);
});
