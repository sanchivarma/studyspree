import { beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: auth.create }));
import { POST } from "./route";

const sessionId = "00000000-0000-4000-8000-000000000001";
const clientId = "00000000-0000-4000-8000-000000000002";
const read = { operation: "read", sessionId };
const add = { operation: "add", sessionId, clientId, body: "Remember chapter three" };
const note = { id: clientId, sessionId, body: add.body, createdAt: "2026-10-22T12:00:00+02:00" };
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("http://localhost/api/session-notes", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.resetAllMocks();
  auth.create.mockResolvedValue({ auth: { getUser: auth.getUser }, rpc: auth.rpc });
  auth.getUser.mockResolvedValue({ data: { user: { id: "signed-in-owner" } }, error: null });
  auth.rpc.mockResolvedValue({ data: { items: [], nextCursor: null }, error: null });
});

it("rejects cross-origin and non-JSON requests before opening an account client", async () => {
  expect((await POST(request(read, { origin: "https://another.example" }))).status).toBe(403);
  expect((await POST(request(read, { "Content-Type": "text/plain" }))).status).toBe(400);
  expect(auth.create).not.toHaveBeenCalled();
});

it("rejects malformed, oversized and forged note fields before authentication", async () => {
  const malformed = new Request("http://localhost/api/session-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  expect((await POST(malformed)).status).toBe(400);
  for (const value of [
    { ...read, sessionId: "not-a-session" }, { ...add, body: " " }, { ...add, body: "x".repeat(2001) },
    { ...add, body: "x".repeat(16385) }, { ...add, userId: "another-owner" },
    { ...add, createdAt: note.createdAt }, { ...read, duration: 10 },
  ]) expect((await POST(request(value))).status).toBe(400);
  expect(auth.create).not.toHaveBeenCalled();
});

it.each([
  { data: { user: null }, error: null },
  { data: { user: null }, error: { message: "Private authentication details" } },
])("rejects missing authentication without calling note RPCs", async identity => {
  auth.getUser.mockResolvedValue(identity);
  const response = await POST(request(read));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "unavailable" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(auth.rpc).not.toHaveBeenCalled();
});

it("reads a private notebook using only the authenticated client and validated cursor", async () => {
  const cursor = { at: "2026-10-22T10:00:00Z", id: clientId };
  const response = await POST(request({ ...read, cursor }));
  expect(response.status).toBe(200);
  expect(auth.getUser).toHaveBeenCalledTimes(1);
  expect(auth.rpc).toHaveBeenCalledWith("read_session_notes", { p_session: sessionId, p_after_at: cursor.at, p_after_id: cursor.id });
  expect(await response.json()).toEqual({ items: [], nextCursor: null });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("adds a trimmed note with an idempotency key and returns the server timestamp", async () => {
  auth.rpc.mockResolvedValue({ data: note, error: null });
  const response = await POST(request({ ...add, body: `  ${add.body}  ` }));
  expect(response.status).toBe(200);
  expect(auth.rpc).toHaveBeenCalledWith("add_session_note", { p_session: sessionId, p_body: add.body, p_client: clientId });
  expect(await response.json()).toEqual({ ...note, createdAt: "2026-10-22T10:00:00.000Z" });
});

it.each([
  ["42501", 403], ["22023", 400], ["54000", 429], ["XX000", 503],
])("maps database code %s without exposing details", async (code, status) => {
  auth.rpc.mockResolvedValue({ data: null, error: { code, message: "Private database details" } });
  const response = await POST(request(add));
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: "unavailable" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("rejects malformed database output instead of exposing an unvalidated response", async () => {
  auth.rpc.mockResolvedValue({ data: { items: [{ ...note, body: null }], nextCursor: null }, error: null });
  const response = await POST(request(read));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "unavailable" });
});
