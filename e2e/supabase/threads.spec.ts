import { expect, test, type Page } from "@playwright/test";
import { createLocalAccount } from "./localAccount";
import { mutationResultSchema, type CommunityCommand } from "../../src/lib/community/schemas";

async function mutate(page: Page, command: CommunityCommand) {
  const response = await page.request.post("/api/community", { data: { operation: "mutate", command } });
  const value = await response.json();
  expect(response.ok(), `${command.action}: HTTP ${response.status()} ${value.error ?? ""}`).toBe(true); return mutationResultSchema.parse(value);
}

test("private thread drawer separates replies, refreshes messages and restores keyboard focus", async ({ page, browser }) => {
  test.setTimeout(150000);
  await createLocalAccount(page, "Thread author");
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage(); await createLocalAccount(other, "Thread reader");
    await mutate(other, { action: "preferences", data: { allowMessages: true } });
    const preferences = await other.request.post("/api/community", { data: { operation: "read", area: "preferences", query: {} } });
    const otherId = (await preferences.json()).viewerId;
    const conversation = await mutate(page, { action: "thread.create", data: { title: "Reading discussion", members: [otherId] } });
    const root = await mutate(page, { action: "message.send", data: { id: conversation.id, body: "Opening thought for this thread", clientId: crypto.randomUUID() } });
    await mutate(page, { action: "message.send", data: { id: conversation.id, body: "A different root message", clientId: crypto.randomUUID() } });
    await page.goto(`/conversations/${conversation.id}`);
    const article = page.getByRole("article").filter({ has: page.getByText("Opening thought for this thread", { exact: true }) });
    const trigger = article.getByRole("button", { name: /\d+ replies$/ }); await expect(trigger).toHaveText("0 replies"); await trigger.click();
    const panel = page.getByRole("dialog", { name: "Thread", exact: true });
    await expect(panel).toBeVisible(); await expect(panel).not.toContainText("A different root message");
    await panel.getByLabel("Message or description", { exact: true }).fill("First reply in this thread");
    await panel.getByRole("button", { name: "Send", exact: true }).click();
    await expect(panel.getByRole("listitem").filter({ hasText: "First reply in this thread" })).toHaveCount(1);
    const reply = await mutate(other, { action: "message.send", data: { id: conversation.id, parentId: root.id, body: "A reply from the reader", clientId: crypto.randomUUID() } });
    await expect(panel).toContainText("A reply from the reader", { timeout: 15000 });
    await page.keyboard.press("Escape"); await expect(panel).not.toBeVisible(); await expect(trigger).toBeFocused();
    await mutate(other, { action: "message.save", data: { id: reply.id, value: true } });
    await mutate(other, { action: "thread.leave", data: { id: conversation.id } });
    const saved = await other.request.post("/api/community", { data: { operation: "read", area: "messages", query: { filter: "saved" } } });
    expect(saved.ok()).toBe(true); expect((await saved.json()).items).toHaveLength(0);
  } finally { await otherContext.close(); }
});
