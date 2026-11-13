import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), oauth: vi.fn(), reset: vi.fn(), update: vi.fn(), logout: vi.fn(), single: vi.fn(), from: vi.fn(), magic: vi.fn(), profileUpdate: vi.fn(), returnTo: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/returnToServer", () => ({ consumeAuthReturnTo: mocks.returnTo, clearAuthReturnTo: vi.fn() }));
vi.mock("@/lib/auth/devAdmin", () => ({ getDevAdminProfile: async () => null, loginDevAdmin: async () => null, clearDevAdminSession: async () => false }));
vi.mock("@/lib/auth/config", () => ({ getAuthConfig: mocks.config, getSiteUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: async () => ({
  rpc: mocks.rpc, from: mocks.from,
  auth: { getUser: mocks.getUser, signInWithPassword: mocks.signIn, signUp: mocks.signUp, signInWithOAuth: mocks.oauth, resetPasswordForEmail: mocks.reset, updateUser: mocks.update, signOut: mocks.logout, signInWithOtp: mocks.magic },
}) }));
import { authRepository } from "./authRepository";

describe("Supabase auth repository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.returnTo.mockResolvedValue("/");
    mocks.config.mockReturnValue({ url: "https://example.supabase.co", key: "test-key" });
    vi.stubEnv("SUPABASE_USERNAME_LOOKUP_SECRET", "test-secret-not-a-real-key-0000000000");
    mocks.signIn.mockResolvedValue({ data: { user: { id: "00000000-0000-4000-8000-000000000001" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "00000000-0000-4000-8000-000000000001" } }, error: null });
    mocks.single.mockResolvedValue({ data: { id: "00000000-0000-4000-8000-000000000001", username: "alex", first_name: "Alex", last_name: "", selected_theme: "rain-desk", show_streak: true, onboarding_complete: true }, error: null });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ single: mocks.single }) }), update: mocks.profileUpdate });
    mocks.profileUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: mocks.single }) }) });
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
    expect(result).toEqual({ status: "success", navigate: "/" });
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
  const registration = { firstName: "Alex", lastName: "Sample", username: " ALEX ", email: " Alex@example.com ", password: "secret-password" };
  it("checks Supabase for a normalized username before creating the account", async () => {
    mocks.rpc.mockResolvedValue({ data: "private@example.com", error: null });
    expect(await authRepository.execute("register", registration)).toEqual({ status: "error", fieldErrors: { username: "register.usernameTaken" } });
    expect(mocks.rpc).toHaveBeenCalledWith("lookup_login_email", { p_username: "alex", p_lookup_secret: expect.any(String) });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("returns field errors before querying Supabase for malformed registration", async () => {
    expect(await authRepository.execute("register", { ...registration, email: "invalid", password: "x" })).toMatchObject({ status: "error", fieldErrors: { email: "register.emailInvalid", password: "register.passwordInvalid" } });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("does not proceed when username lookup is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await authRepository.execute("register", registration)).status).toBe("error");
    expect(mocks.signUp).not.toHaveBeenCalled();
    vi.stubEnv("SUPABASE_USERNAME_LOOKUP_SECRET", "");
    expect((await authRepository.execute("register", registration)).message).toBe("common.authUnavailable");
  });
  it("handles a username claimed concurrently during signup", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: "private@example.com", error: null });
    mocks.signUp.mockResolvedValue({ error: { code: "unexpected_failure" } });
    expect(await authRepository.execute("register", registration)).toEqual({ status: "error", fieldErrors: { username: "register.usernameTaken" } });
  });
  it.each([
    ["weak_password", { status: "error", fieldErrors: { password: "register.passwordWeak" } }],
    ["over_email_send_rate_limit", { status: "error", message: "register.rateLimited" }],
    ["user_already_exists", { status: "error", message: "common.authError" }],
  ])("maps signup error %s without leaking email existence", async (code, expected) => {
    mocks.signUp.mockResolvedValue({ error: { code } });
    expect(await authRepository.execute("register", registration)).toEqual(expected);
  });
  it("passes normalized details and a confirmation redirect to signup", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    await authRepository.execute("register", registration);
    expect(mocks.signUp).toHaveBeenCalledWith({ email: "alex@example.com", password: "secret-password", options: { data: { first_name: "Alex", last_name: "Sample", username: "alex" }, emailRedirectTo: "http://localhost:3000/auth/callback" } });
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
  it("requests PKCE magic mail without inventing a signed-in session", async () => {
    mocks.magic.mockResolvedValue({ error: null });
    expect(await authRepository.execute("magicLink", "alex@example.test")).toEqual({ status: "success", message: "login.linkSent" });
    expect(mocks.magic).toHaveBeenCalledWith({ email: "alex@example.test", options: { shouldCreateUser: true, emailRedirectTo: "http://localhost:3000/auth/callback" } });
    expect((await authRepository.execute("magicLink", "invalid")).status).toBe("error");
    expect(mocks.magic).toHaveBeenCalledTimes(1);
  });
  it("validates onboarding and saves preferences for the verified user", async () => {
    const input = { displayName: "Sanchi", timezone: "Europe/Berlin", selectedTheme: "night-shift", showStreak: true, reduceMotion: false };
    expect(await authRepository.execute("onboard", input)).toEqual({ status: "success", navigate: "/" });
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ display_name: "Sanchi", selected_theme: "night-shift", onboarding_complete: true, webcam_enabled: false, ambience_enabled: false }));
    expect((await authRepository.execute("onboard", { ...input, actualSeconds: 600 })).status).toBe("error");
    expect(mocks.profileUpdate).toHaveBeenCalledTimes(1);
  });

});
