import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), state: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: async () => ({ auth: { getUser: mocks.user } }) }));
vi.mock("@/lib/integrations/spotify", () => ({ spotifyAdapter: { getState: mocks.state } }));
import { GET } from "./route";
beforeEach(() => vi.clearAllMocks());
it("does not read connection state for an anonymous request", async () => {
  mocks.user.mockResolvedValue({ error: null, data: { user: null } });
  expect((await GET()).status).toBe(401); expect(mocks.state).not.toHaveBeenCalled();
});
it("returns a narrow unavailable state rather than a fake connection or provider tokens", async () => {
  mocks.user.mockResolvedValue({ error: null, data: { user: { id: "owner" } } });
  mocks.state.mockResolvedValue({ provider: "spotify", available: false, connected: false, reason: "notConfigured" });
  const response = await GET(); expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ provider: "spotify", available: false, connected: false, reason: "notConfigured" });
  expect(mocks.state).toHaveBeenCalledWith("owner");
});
