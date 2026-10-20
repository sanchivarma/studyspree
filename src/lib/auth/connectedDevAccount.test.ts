import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { connectedDevAccountEmail } from "./connectedDevAccount";

describe("connected local development account", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("DEV_ADMIN_USE_SUPABASE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "local-public-test-key");
    vi.stubEnv("DEV_ADMIN_USERNAME", "ss_admin");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("requires an explicit opt-in and a local database", () => {
    expect(connectedDevAccountEmail()).toBe("ss_admin@local.studyspree.test");
    vi.stubEnv("DEV_ADMIN_USE_SUPABASE", "false"); expect(connectedDevAccountEmail()).toBeNull();
    vi.stubEnv("DEV_ADMIN_USE_SUPABASE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co"); expect(connectedDevAccountEmail()).toBeNull();
  });
  it("cannot authenticate the development account in production", () => {
    vi.stubEnv("NODE_ENV", "production"); expect(connectedDevAccountEmail()).toBeNull();
  });
  it("rejects malformed or missing development identities", () => {
    vi.stubEnv("DEV_ADMIN_USERNAME", "not an account"); expect(connectedDevAccountEmail()).toBeNull();
    vi.stubEnv("DEV_ADMIN_USERNAME", ""); expect(connectedDevAccountEmail()).toBeNull();
  });
});
