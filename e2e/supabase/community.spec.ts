import { expect, test, type Page } from "@playwright/test";
import { createLocalAccount } from "./localAccount";
import { communityStateSchema, mutationResultSchema, type CommunityCommand, type CommunityArea, type CommunityQuery } from "../../src/lib/community/schemas";
async function mutate(page: Page, command: CommunityCommand) { const response = await page.request.post("/api/community", { data: { operation: "mutate", command } }); expect(response.ok(), `Mutation ${command.action}: ${response.status()}`).toBe(true); return mutationResultSchema.parse(await response.json()); }
async function read(page: Page, area: CommunityArea, query: CommunityQuery = {}) { const response = await page.request.post("/api/community", { data: { operation: "read", area, query } }); expect(response.ok(), `Read ${area}: ${response.status()}`).toBe(true); return communityStateSchema.parse(await response.json()); }
test("real accounts use trusted session storage and all community pages", async ({ page, browser }) => {
    test.setTimeout(180000);
    page.on("pageerror",error=>console.info("Browser error:",error.name,error.message.slice(0,180)));
    page.on("response",async response=>{if(new URL(response.url()).pathname!=="/api/repository")return;try{const op=JSON.parse(response.request().postData()??"{}").op;if(["active","session","finish"].includes(op)){const value=await response.json();console.info("Repository:",op,response.status(),Boolean(value?.id),Boolean(value?.endedAt));}}catch{}});
    await createLocalAccount(page, "Community A");
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    try {
        await createLocalAccount(other, "Community B");
        console.info("Community verification: accounts ready");
        const a = (await read(page, "preferences")).viewerId;
        const b = (await read(other, "preferences")).viewerId;
        const task = await mutate(page, { action: "task.create", data: { title: "Read chapter", date: "2026-10-16" } });
        expect((await read(other, "tasks")).items.some(i => i.id === task.id)).toBe(false);
        await mutate(page, { action: "task.update", data: { id: task.id, done: true } });
        await mutate(page, { action: "feedback.create", data: { kind: "idea", body: "A quieter room toolbar" } });
        const group = await mutate(page, { action: "group.create", data: { title: "Integration group", body: "Study together", private: false } });
        await mutate(other, { action: "group.join", data: { id: group.id } });
        await mutate(page, { action: "group.role", data: { id: group.id, targetId: b, role: "moderator" } });
        const room = await mutate(page, { action: "room.create", data: { title: "Integration space", body: "Quiet room", category: "deep", private: false, capacity: 2 } });
        await mutate(page, { action: "room.join", data: { id: room.id } });
        await mutate(other, { action: "room.join", data: { id: room.id } });
        const presence = await read(page, "room", { id: room.id });
        expect(presence.context.people).toHaveLength(2);
        const dashboard=await page.request.post("/api/repository",{data:{op:"dashboard"}});expect(dashboard.ok()).toBe(true);const home=await dashboard.json();expect(home.activeRoomId).toBe(room.id);expect(home.onlinePeople.some((person:{id:string})=>person.id===b)).toBe(true);
        await mutate(page, { action: "room.pin", data: { id: room.id, targetId: b, value: true, reason: "Study partner" } });
        await mutate(page, { action: "room.status", data: { id: room.id, body: "Reading" } });
        const invitation = await mutate(page, { action: "room.invite", data: { id: room.id, uses: 1, hours: 1 } });
        expect(invitation.token).toMatch(/^[a-f0-9]{64}$/);
        await mutate(other, { action: "room.accept", data: { token: invitation.token! } });
        await mutate(page, { action: "preferences", data: { allowMessages: true } });
        await mutate(other, { action: "preferences", data: { allowMessages: true } });
        await mutate(page, { action: "buddy.save", data: { title: "Math partner", body: "Read together", subjects: ["Math"], published: true } });
        expect((await read(other, "buddies", { q: "Math" })).items.some(i => i.ownerId === a)).toBe(true);
        const thread = await mutate(other, { action: "thread.direct", data: { targetId: a } });
        const clientId = crypto.randomUUID();
        const message = { action: "message.send" as const, data: { id: thread.id, body: "Hello study partner", clientId } };
        const first = await mutate(other, message);
        expect((await mutate(other, message)).id).toBe(first.id);
        await mutate(page, { action: "message.save", data: { id: first.id, value: true } });
        expect((await read(page, "messages", { id: thread.id })).items).toHaveLength(1);
        const post = await mutate(page, { action: "post.create", data: { body: "A productive afternoon" } });
        await mutate(other, { action: "post.react", data: { id: post.id, emoji: "support" } });
        await mutate(other, { action: "post.save", data: { id: post.id, value: true } });
        await mutate(other, { action: "post.create", data: { body: "Thanks for studying", parentId: post.id } });
        expect((await read(page, "feed", { id: post.id, filter: "popular" })).items).toHaveLength(1);
        const event = await mutate(page, { action: "event.create", data: { title: "Tomorrow study", startsAt: new Date(Date.now() + 86400000).toISOString(), minutes: 30, capacity: 2 } });
        await mutate(other, { action: "event.book", data: { id: event.id } });
        expect((await read(page, "notifications")).items.length).toBeGreaterThan(0);
        await mutate(other, { action: "report.create", data: { kind: "post", targetId: post.id, reason: "Integration report" } });
        await page.goto(`/rooms/${room.id}`);
        await expect(page.getByTestId("room-screen")).toBeVisible();
        await expect(page.getByText("2 in the room", { exact: true })).toBeVisible();
        await mutate(page, { action: "room.leave", data: { id: room.id } });
        await mutate(other, { action: "room.leave", data: { id: room.id } });
        console.info("Community verification: shared operations passed");
        const start = await page.request.post("/api/repository", { data: { op: "start", input: { plannedMinutes: 25, themeSlug: "rain-desk", task: "Real storage", companions: { mode: "characters", characterSlugs: ["female-01"] } } } });
        expect(start.ok()).toBe(true);
        const session = await start.json();
        const activeResponse=await page.request.post("/api/repository",{data:{op:"active"}});expect(activeResponse.ok()).toBe(true);expect((await activeResponse.json()).id).toBe(session.id);
        await page.goto(`/session/${session.id}`);
        await expect(page.getByTestId("session-screen")).toBeVisible();
        await page.reload();
        await expect(page.getByTestId("session-screen")).toBeVisible();
        await page.waitForTimeout(3000);
        await page.getByRole("button", { name: "Finish", exact: true }).click();
        await expect(page).toHaveURL(/\/complete$/);
        await expect(page.getByTestId("complete-screen")).toBeVisible();
        const stored = await page.request.post("/api/repository", { data: { op: "session", id: session.id } });
        expect((await stored.json()).actualSeconds).toBeGreaterThanOrEqual(3);
        expect(await page.evaluate(() => localStorage.getItem("ss_sessions"))).toBeNull();
        console.info("Community verification: server timer passed");
        for (const path of ["/tasks", "/notifications", "/feedback", "/groups", "/spaces", "/buddies", "/conversations", "/feed", "/schedule", "/partners", "/search", "/plans", "/preferences", "/leaderboards"]) {
            console.info("Community page:",path);
            const loaded=page.waitForResponse(response=>{if(new URL(response.url()).pathname!=="/api/community")return false;try{const body=JSON.parse(response.request().postData()??"{}");return body.operation==="read"&&body.area===path.slice(1);}catch{return false;}});
            await page.goto(path);
            expect((await loaded).ok()).toBe(true);
            await expect(page.locator('[data-testid^="community-"]')).toBeVisible();
            await expect(page.locator('[data-testid^="community-"]').getByText("Loading?",{exact:true})).toHaveCount(0);
            await expect(page.locator('[data-testid^="community-"]').getByRole("alert")).toHaveCount(0);
        }
        await page.goto("/stats");
        await expect(page.getByRole("heading", { name: "Stats", exact: true })).toBeVisible();
        await mutate(other, { action: "block.set", data: { targetId: a, value: true } });
        const denied = await other.request.post("/api/community", { data: { operation: "mutate", command: { action: "thread.direct", data: { targetId: a } } } });
        expect(denied.status()).toBe(403);
    }
    finally {
        await otherContext.close();
    }
});
