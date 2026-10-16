import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/lib/repo/serverStudy", () => ({ executeStudy: mock.execute, StudyError: class extends Error {
        constructor(public status: number) { super(); }
    } }));
import { POST } from "./route";
import { StudyError } from "@/lib/repo/serverStudy";
beforeEach(() => { mock.execute.mockReset(); });
const request = (value: unknown) => new Request("http://localhost/api/repository", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
it("rejects nested duration forgery, extra fields and invalid IDs", async () => {
    for (const value of [{ op: "start", input: { elapsed: 1 } }, { op: "session", id: "bad" }, { op: "total", userId: crypto.randomUUID() }])
        expect((await POST(request(value))).status).toBe(400);
    expect(mock.execute).not.toHaveBeenCalled();
});
it("returns auth errors without leaking server details", async () => {
    mock.execute.mockImplementation(() => { throw new StudyError(401); });
    const response = await POST(request({ op: "profile" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ error: "unavailable" });
});
