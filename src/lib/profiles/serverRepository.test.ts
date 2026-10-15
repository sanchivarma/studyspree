import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ create: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: mocks.create }));
vi.mock("@/lib/auth/devAdmin", () => ({ getDevAdminProfile: mocks.preview }));
import { serverProfileRepository as repository } from "./serverRepository";
import { editOwnProfile, readOwnProfile, setProfileFollow } from "@/app/profileActions";
describe("profile server authorization", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.preview.mockResolvedValue(null); });
  it("rejects signed-out reads and writes before touching database tables", async () => {
    const from = vi.fn(); mocks.create.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null }, error: null }) }, from });
    await expect(repository.getOwn()).rejects.toThrow("unauthorized");
    await expect(repository.getPublic("some_user")).rejects.toThrow("unauthorized");
    expect(from).not.toHaveBeenCalled();
    expect(await readOwnProfile()).toEqual({ ok: false, code: "unauthorized" });
  });
  it("strictly validates writes and follow targets before executing", async () => {
    expect(await editOwnProfile({ duration: 1 })).toEqual({ ok: false, code: "invalid" });
    expect(await setProfileFollow({ username: "../../admin", following: true })).toEqual({ ok: false, code: "invalid" });
    expect(await setProfileFollow({ username: "some_user", following: true, id: "other" })).toEqual({ ok: false, code: "invalid" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses an explicit development directive without creating a remote identity", async () => {
    mocks.preview.mockResolvedValue({ username: "ss_admin" });
    expect(await readOwnProfile()).toEqual({ ok: true, value: null });
    expect(await setProfileFollow({ username: "some_user", following: true })).toEqual({ ok: false, code: "unavailable" });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
