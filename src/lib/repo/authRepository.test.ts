import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), oauth: vi.fn(), reset: vi.fn(), update: vi.fn(), logout: vi.fn(), single: vi.fn(), from: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/devAdmin", () => ({ getDevAdminProfile: async () => null, loginDevAdmin: async () => null, clearDevAdminSession: async () => false }));
vi.mock("@/lib/auth/config", () => ({ getAuthConfig: mocks.config, getSiteUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: async () => ({
  rpc: mocks.rpc, from: mocks.from,
  auth: { getUser: mocks.getUser, signInWithPassword: mocks.signIn, signUp: mocks.signUp, signInWithOAuth: mocks.oauth, resetPasswordForEmail: mocks.reset, updateUser: mocks.update, signOut: mocks.logout },
}) }));
import { authRepository } from "./authRepository";

describe("Supabase auth repository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.config.mockReturnValue({ url: "https://example.supabase.co", key: "test-key" });
    vi.stubEnv("SUPABASE_USERNAME_LOOKUP_SECRET", "test-secret-not-a-real-key-0000000000");
    mocks.signIn.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ single: mocks.single }) }) });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not invent a session when configuration is absent", async () => {
    mocks.config.mockReturnValue(null);
    expect(await authRepository.getProfile()).toBeNull();
    expect(await authRepository.execute("login", {})).toEqual({ status: "error", message: "common.authUnavailable" });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("rejects malformed input before username lookup", async () => {
    expect((await authRepository.execute("login", { username: "../../admin", password: "x" })).message).toBe("common.invalidFields");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("resolves usernames on the server and never returns an email", async () => {
    mocks.rpc.mockResolvedValue({ data: "alex@example.com", error: null });
    const result = await authRepository.execute("login", { username: "ALEX_123", password: "secret" });
    expect(mocks.rpc).toHaveBeenCalledWith("lookup_login_email", { p_username: "alex_123", p_lookup_secret: "test-secret-not-a-real-key-0000000000" });
    expect(mocks.signIn).toHaveBeenCalledWith({ email: "alex@example.com", password: "secret" });
    expect(result).toEqual({ status: "success", navigate: "/home" });
  });
  it("uses a generic response for unknown usernames and wrong passwords", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
    expect(await authRepository.execute("login", { username: "unknown", password: "secret" })).toEqual({ status: "error", message: "login.invalidCredentials" });
    expect(mocks.signIn).toHaveBeenCalledWith({ email: "unknown@invalid.example", password: "secret" });
  });
  it("shows the same credential error for an existing account with a wrong password", async () => {
    mocks.rpc.mockResolvedValue({ data: "alex@example.com", error: null });
    mocks.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
    expect(await authRepository.execute("login", { username: "alex", password: "incorrect" })).toEqual({ status: "error", message: "login.invalidCredentials" });
  });
  it("keeps connection errors distinct from incorrect credentials", async () => {
    mocks.rpc.mockResolvedValue({ data: "alex@example.com", error: null });
    mocks.signIn.mockResolvedValue({ error: { code: "unexpected_failure" } });
    expect(await authRepository.execute("login", { username: "alex", password: "secret" })).toEqual({ status: "error", message: "common.authError" });
  });
  it("does not allow login without a server lookup secret", async () => {
    vi.stubEnv("SUPABASE_USERNAME_LOOKUP_SECRET", "");
    expect((await authRepository.execute("login", { username: "alex", password: "secret" })).message).toBe("common.authUnavailable");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("waits for confirmation when registration does not return a session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(await authRepository.execute("register", { firstName: "Alex", lastName: "Sample", username: "alex", email: "alex@example.com", password: "secret-password" })).toEqual({ status: "success", message: "register.checkEmail" });
  });
  it.each(["google", "facebook"] as const)("starts real %s OAuth", async (provider) => {
    mocks.oauth.mockResolvedValue({ data: { url: "https://example.supabase.co/auth/v1/authorize" }, error: null });
    expect((await authRepository.execute(provider, undefined)).external).toBe(true);
    expect(mocks.oauth).toHaveBeenCalledWith({ provider, options: { redirectTo: "http://localhost:3000/auth/callback" } });
  });
  it("requires a verified identity before reading profile data", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("Bad token") });
    expect(await authRepository.getProfile()).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("requires a verified identity before changing a password", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await authRepository.execute("updatePassword", "secret-password")).status).toBe("error");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("sends password recovery to the dedicated recovery route", async () => {
    mocks.reset.mockResolvedValue({ error: null });
    expect((await authRepository.execute("reset", "alex@example.com")).message).toBe("recovery.sent");
    expect(mocks.reset).toHaveBeenCalledWith("alex@example.com", { redirectTo: "http://localhost:3000/auth/callback?next=/reset-password" });
  });
});
