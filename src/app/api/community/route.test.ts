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
