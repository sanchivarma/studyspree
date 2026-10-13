import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ token: "", set: vi.fn(), delete: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: () => store.token ? { value: store.token } : undefined,
  set: store.set,
  delete: store.delete,
}) }));
import { clearDevAdminSession, getDevAdminProfile, hasDevAdmin, loginDevAdmin } from "./devAdmin";

describe("development preview authentication", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_ADMIN_USERNAME", "ss_admin");
    vi.stubEnv("DEV_ADMIN_PASSWORD", "ss_password");
    vi.stubEnv("DEV_ADMIN_SESSION_SECRET", "test-secret-for-signed-preview-cookies-123");
    store.token = "";
    vi.clearAllMocks();
    store.set.mockImplementation((_name: string, token: string) => { store.token = token; });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("signs a cookie for the configured credentials and reads its profile", async () => {
    expect(await loginDevAdmin({ username: "ss_admin", password: "ss_password" })).toEqual({ status: "success", navigate: "/home" });
    expect(store.set).toHaveBeenCalledWith("ss_dev_admin", expect.any(String), expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
    expect(await getDevAdminProfile()).toMatchObject({ username: "ss_admin", selected_character: "rain-desk", show_streak: false });
  });
  it("rejects incorrect passwords without creating a cookie", async () => {
    expect(await loginDevAdmin({ username: "ss_admin", password: "incorrect" })).toEqual({ status: "error", message: "common.authError" });
    expect(store.set).not.toHaveBeenCalled();
  });
  it("leaves ordinary accounts to Supabase", async () => {
    expect(await loginDevAdmin({ username: "someone_else", password: "ss_password" })).toBeNull();
  });
  it("rejects modified and expired sessions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T10:00:00Z"));
    await loginDevAdmin({ username: "ss_admin", password: "ss_password" });
    const valid = store.token;
    store.token = `X${valid}`;
    expect(await getDevAdminProfile()).toBeNull();
    store.token = valid;
    vi.setSystemTime(new Date("2026-10-14T10:00:01Z"));
    expect(await getDevAdminProfile()).toBeNull();
  });
  it("ignores credentials and existing cookies in production", async () => {
    await loginDevAdmin({ username: "ss_admin", password: "ss_password" });
    vi.stubEnv("NODE_ENV", "production");
    expect(hasDevAdmin()).toBe(false);
    expect(await loginDevAdmin({ username: "ss_admin", password: "ss_password" })).toBeNull();
    expect(await getDevAdminProfile()).toBeNull();
  });
  it("requires a sufficiently long signing secret", () => {
    vi.stubEnv("DEV_ADMIN_SESSION_SECRET", "short");
    expect(hasDevAdmin()).toBe(false);
  });
  it("clears the preview session at logout", async () => {
    await loginDevAdmin({ username: "ss_admin", password: "ss_password" });
    expect(await clearDevAdminSession()).toBe(true);
    expect(store.delete).toHaveBeenCalledWith("ss_dev_admin");
  });
});
