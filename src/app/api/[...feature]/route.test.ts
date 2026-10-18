import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ study: vi.fn(), community: vi.fn() }));
vi.mock("@/lib/repo/serverStudy", () => ({ executeStudy: mocks.study, StudyError: class extends Error { constructor(public status: number) { super(); } } }));
vi.mock("@/lib/community/server", () => ({ executeCommunity: mocks.community, CommunityServerError: class extends Error { constructor(public status: number) { super(); } } }));
vi.mock("@/lib/community/serverPatch", () => ({ executeResourcePatch: vi.fn() }));
vi.mock("@/lib/profiles/serverRepository", () => ({ serverProfileRepository: {}, ProfileAccessError: class extends Error {} }));
import { GET, POST, DELETE } from "./route";
import { StudyError } from "@/lib/repo/serverStudy";
const context = (...feature: string[]) => ({ params: Promise.resolve({ feature }) });
beforeEach(() => vi.clearAllMocks());
it("requires a real authenticated dashboard read and returns private no-store responses", async () => {
  mocks.study.mockRejectedValue(new StudyError(401));
  const response = await GET(new Request("http://localhost/api/dashboard"), context("dashboard"));
  expect(response.status).toBe(401); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("rejects unsupported methods before interpreting them as another mutation", async () => {
  const response = await DELETE(new Request("http://localhost/api/spaces", { method: "DELETE" }), context("spaces"));
  expect(response.status).toBe(405); expect(response.headers.get("Allow")).toBe("GET, POST"); expect(mocks.community).not.toHaveBeenCalled();
});
it("rejects extra path segments and invalid resource identities", async () => {
  expect((await POST(new Request("http://localhost/api/rooms/x/join/extra", { method: "POST", body: "{}" }), context("rooms", "x", "join", "extra"))).status).toBe(404);
  expect((await POST(new Request("http://localhost/api/rooms/x/join", { method: "POST", body: "{}" }), context("rooms", "x", "join"))).status).toBe(400);
  expect(mocks.community).not.toHaveBeenCalled();
});
it("rejects client time and identity injection before repository execution", async () => {
  for (const body of [{ body: "Hello", elapsed: 60 }, { body: "Hello", actualSeconds: 60 }, { body: "Hello", authorId: "spoof" }]) {
    expect((await POST(new Request("http://localhost/api/posts", { method: "POST", body: JSON.stringify(body) }), context("posts"))).status).toBe(400);
  }
  expect(mocks.community).not.toHaveBeenCalled();
});
it("rejects cross-origin mutations", async () => {
  const response = await POST(new Request("http://localhost/api/posts", { method: "POST", headers: { Origin: "https://other.example" }, body: '{"body":"Hello"}' }), context("posts"));
  expect(response.status).toBe(403); expect(mocks.community).not.toHaveBeenCalled();
});
