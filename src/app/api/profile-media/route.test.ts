import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: mock.create }));
import { GET } from "./[...path]/route";
beforeEach(() => { vi.resetAllMocks(); });
it("rejects invalid media paths before loading authentication", async () => {
  expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ path: ["..", "secrets.svg"] }) })).status).toBe(404);
  expect(mock.create).not.toHaveBeenCalled();
});
it("rejects signed-out media requests before accessing storage", async () => {
  const storage = vi.fn(); mock.create.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null }, error: null }) }, storage });
  const path = ["10000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000001.png"];
  expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ path }) })).status).toBe(401);
  expect(storage).not.toHaveBeenCalled();
});
