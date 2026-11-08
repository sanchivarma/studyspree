import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/lib/community/server", () => ({ executeCommunity: mock.execute, CommunityServerError: class extends Error {
        constructor(public status: number, public code: string) { super(code); }
    } }));
import { POST } from "./route";
import { CommunityServerError } from "@/lib/community/server";
beforeEach(() => { mock.execute.mockReset(); });
const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/community", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
it("rejects foreign origins and caller-supplied durations before repository access", async () => {
    expect((await POST(request({}, "https://elsewhere.test"))).status).toBe(403);
    expect((await POST(request({ operation: "mutate", command: { action: "task.create", data: { duration: 999 } } }))).status).toBe(400);
    expect(mock.execute).not.toHaveBeenCalled();
});
it("rejects malformed data and preserves the auth error boundary", async () => {
    expect((await POST(request({ operation: "read", area: "admin", query: {} }))).status).toBe(400);
    mock.execute.mockImplementation(() => { throw new CommunityServerError(401, "accountRequired"); });
    const response = await POST(request({ operation: "read", area: "tasks", query: {} }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "accountRequired" });
});
it("validates room creation controls and deletion IDs before calling the database", async () => {
    const data = { title: "Desk", body: "", category: "deep", private: true, capacity: 60, roomKind: "permanent-solo" };
    for (const command of [
        { action: "room.create", data },
        { action: "room.create", data: { ...data, roomKind: "forever" } },
        { action: "room.delete", data: { id: "bad" } },
        { action: "room.unsave", data: { id: "bad" } },
        { action: "room.unsave", data: { id: crypto.randomUUID(), userId: crypto.randomUUID() } },
        { action: "room.delete", data: { id: crypto.randomUUID(), ownerId: crypto.randomUUID() } },
    ]) expect((await POST(request({ operation: "mutate", command }))).status).toBe(400);
    expect(mock.execute).not.toHaveBeenCalled();
    mock.execute.mockResolvedValue({ id: "78000000-0000-4000-8000-000000000010" });
    expect((await POST(request({ operation: "mutate", command: { action: "room.delete", data: { id: "78000000-0000-4000-8000-000000000010" } } }))).status).toBe(200);
});
