import { expect, test, type Page } from "@playwright/test";
import { createLocalAccount } from "./localAccount";
import type { CommunityCommand } from "../../src/lib/community/schemas";

async function mutate(page: Page, command: CommunityCommand) {
  const response = await page.request.post("/api/community", { data: { operation: "mutate", command } });
  expect(response.ok(), `${command.action}: ${response.status()}`).toBe(true);
  return await response.json() as { id: string };
}
test("two people introduce themselves and see one goal per join without changing the timer", async ({ page, browser }) => {
  test.setTimeout(120000);
  // Chat must work even when the independent media transport is unavailable.
  // This journey needs no Cloud participant minutes or camera access.
  await page.route("**/api/rooms/token", route => route.fulfill({ status: 503, json: {} }));
  await createLocalAccount(page, "Room host");
  const context = await browser.newContext(); const other = await context.newPage();
  await context.route("**/api/rooms/token", route => route.fulfill({ status: 503, json: {} }));
  try {
    await createLocalAccount(other, "Study guest");
    const room = await mutate(page, { action: "room.create", data: { title: "Chat study room", body: "Quiet study", private: false, category: "deep", capacity: 4 } });
    await page.goto(`/rooms/${room.id}`);
    await page.getByLabel("Session goal (optional)", { exact: true }).fill("Read chapter three");
    await page.getByRole("button", { name: "Join", exact: true }).click();
    await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
    const active = await page.request.post("/api/repository", { data: { op: "active" } }); const original = await active.json() as { id: string; startedAt: string };
    await page.getByRole("button", { name: "Session chat", exact: true }).click();
    await expect(page.getByTestId("room-chat").getByText("Read chapter three", { exact: true })).toHaveCount(1);
    await page.getByLabel("Message", { exact: true }).fill("Hi, I am working on biology.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByTestId("room-chat").getByText("Hi, I am working on biology.", { exact: true })).toBeVisible();
    await other.goto(`/rooms/${room.id}`);
    await other.getByRole("button", { name: "Join", exact: true }).click();
    await expect(other.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
    await other.getByRole("button", { name: "Session chat", exact: true }).click();
    await expect(other.getByText("Hi, I am working on biology.", { exact: true })).toBeVisible();
    await other.getByLabel("Message", { exact: true }).fill("Hi! I am studying maths.");
    await other.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Hi! I am studying maths.", { exact: true })).toBeVisible();
    await page.getByLabel("Message", { exact: true }).focus(); await page.keyboard.press("Escape");
    await expect(page.getByTestId("room-chat")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Session chat", exact: true }).click();
    await expect(page.getByText("Read chapter three", { exact: true })).toHaveCount(1);
    const resumed = await page.request.post("/api/repository", { data: { op: "active" } });
    expect(await resumed.json()).toMatchObject({ id: original.id, startedAt: original.startedAt });
  } finally {
    // Finishing releases personal sessions and room leases without confirmation.
    for (const client of [page, other]) {
      const finish = client.getByRole("button", { name: "Finish", exact: true });
      if (await finish.isVisible()) await finish.click();
    }
    await context.close();
  }
});
