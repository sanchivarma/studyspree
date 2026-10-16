import { expect, test } from "@playwright/test";
import { createLocalAccount } from "./localAccount";
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });
test("explicit room camera reaches a second real account and turns off", async ({ page, browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext({ permissions: ["camera"] });
    const viewer = await context.newPage();
    try {
        await createLocalAccount(page, "Room publisher");
        await createLocalAccount(viewer, "Room viewer");
        const response = await page.request.post("/api/community", { data: { operation: "mutate", command: { action: "room.create", data: { title: "Video integration", body: "Fake camera verification", category: "deep", private: false, capacity: 2 } } } });
        expect(response.ok()).toBe(true);
        const { id } = await response.json();
        await page.goto(`/rooms/${id}`);
        await page.getByLabel("Noah",{exact:true}).check();
        await page.getByLabel("Maya",{exact:true}).check();
        await page.getByRole("button", { name: "Join", exact: true }).click();
        await expect(page.getByText("1 in the room", { exact: true })).toBeVisible();
        await expect(page.getByTestId("character-loop-male-01")).toBeVisible();
        await expect(page.getByTestId("character-loop-female-01")).toBeVisible();
        await page.reload();
        await expect(page.getByTestId("character-loop-male-01")).toBeVisible();
        await expect(page.getByTestId("character-loop-female-01")).toBeVisible();
        await viewer.goto(`/rooms/${id}`);
        await viewer.getByRole("button", { name: "Join", exact: true }).click();
        await expect(viewer.getByText("2 in the room", { exact: true })).toBeVisible();
        expect(await page.locator("video").count()).toBe(0);
        await page.getByRole("button", { name: "Share camera in this room", exact: true }).click();
        await expect.poll(() => viewer.locator("video").evaluateAll(elements => elements.some(element => element instanceof HTMLVideoElement && element.videoWidth > 0)), { timeout: 20000 }).toBe(true);
        await page.getByRole("button", { name: "Turn room camera off", exact: true }).click();
        await expect(viewer.locator("video")).toHaveCount(0, { timeout: 20000 });
        await viewer.getByRole("button", { name: "Finish", exact: true }).click();
        await expect(viewer).toHaveURL(/\/complete$/);
        await page.getByRole("button", { name: "Finish", exact: true }).click();
        await expect(page).toHaveURL(/\/complete$/);
    }
    finally {
        await context.close();
    }
});
