import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/invitations/server", () => ({ sendInvitation: mock.send, InvitationServerError: class extends Error { constructor(public code: string, public status: number) { super(code); } } }));
import { POST } from "./route";
import { InvitationServerError } from "@/lib/invitations/server";
const input = { email: "friend@example.test", locale: "en", requestId: "90000000-0000-4000-8000-000000000001" };
const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/invitations", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
beforeEach(() => vi.resetAllMocks());
it("rejects cross-origin requests and untrusted email fields before sending", async () => {
  expect((await POST(request(input, "https://other.test"))).status).toBe(403);
  expect((await POST(request({ ...input, from: "attacker@example.test" }))).status).toBe(400);
  expect(mock.send).not.toHaveBeenCalled();
});
it("preserves authentication errors and never claims success on rejected delivery", async () => {
  mock.send.mockRejectedValue(new InvitationServerError("unauthorized", 401));
  expect((await POST(request(input))).status).toBe(401);
  mock.send.mockRejectedValue(new Error("private-provider-details"));
  const response = await POST(request(input));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "unavailable" });
});
it("reports local capture explicitly", async () => {
  mock.send.mockResolvedValue({ delivery: "captured" });
  expect(await (await POST(request(input))).json()).toEqual({ delivery: "captured" });
});
