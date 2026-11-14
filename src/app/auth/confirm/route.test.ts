import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({ verify: vi.fn(), destination: vi.fn(), config: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: async () => ({ auth: { verifyOtp: mock.verify } }) }));
vi.mock("@/lib/auth/config", () => ({ getAuthConfig: mock.config }));
vi.mock("@/lib/auth/destination", () => ({ authenticatedDestination: mock.destination }));
import { GET } from "./route";
beforeEach(() => { vi.resetAllMocks(); mock.config.mockReturnValue({}); mock.verify.mockResolvedValue({ error: null }); mock.destination.mockResolvedValue("/onboarding"); });
it("verifies the email token and preserves the actual browser hostname", async () => {
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?token_hash=pkce_test_hash&type=signup", { headers: { host: "127.0.0.1:3000", "x-forwarded-host": "attacker.test" } }));
  expect(mock.verify).toHaveBeenCalledWith({ token_hash: "pkce_test_hash", type: "signup" });
  expect(response.headers.get("location")).toBe("http://127.0.0.1:3000/onboarding");
});
it("directs recovery to password reset on the same host", async () => {
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?token_hash=test_hash&type=recovery", { headers: { host: "192.168.178.30:3000" } }));
  expect(response.headers.get("location")).toBe("http://192.168.178.30:3000/reset-password");
});
it("does not verify unsupported types or absent tokens", async () => {
  for (const query of ["type=signup", "token_hash=test&type=admin"]) {
    const response = await GET(new NextRequest(`http://localhost:3000/auth/confirm?${query}`));
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?authError=1");
  }
  expect(mock.verify).not.toHaveBeenCalled();
});
it("does not sign in with an expired token", async () => {
  mock.verify.mockResolvedValue({ error: { code: "otp_expired" } });
  expect((await GET(new NextRequest("http://localhost:3000/auth/confirm?token_hash=expired&type=signup"))).headers.get("location")).toBe("http://localhost:3000/login?authError=1");
});
