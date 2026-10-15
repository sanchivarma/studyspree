import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), config: vi.fn(), destination: vi.fn() }));
vi.mock("@/lib/auth/config", () => ({ getAuthConfig: mocks.config }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }) }));
vi.mock("@/lib/auth/destination", () => ({ authenticatedDestination: mocks.destination }));
import { GET } from "./route";

describe("OAuth callback", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.config.mockReturnValue({}); mocks.exchange.mockResolvedValue({ error: null }); mocks.destination.mockResolvedValue("/"); });
  it("redirects to Home after a verified code exchange", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback?code=valid"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(mocks.exchange).toHaveBeenCalledWith("valid");
  });
  it("rejects external redirect targets", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback?code=valid&next=https://attacker.example"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
  it("allows the password recovery route", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback?code=valid&next=/reset-password"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  });
  it("does not allow entry with an invalid code", async () => {
    mocks.exchange.mockResolvedValue({ error: new Error("Invalid code") });
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback?code=invalid"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?authError=1");
  });
  it("does not attempt authentication without configuration", async () => {
    mocks.config.mockReturnValue(null);
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback?code=test"));
    expect(response.headers.get("location")).toContain("authError=1");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("sends the first verified sign-in to onboarding", async () => {
    mocks.destination.mockResolvedValue("/onboarding");
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback?code=valid"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/onboarding");
  });
});
