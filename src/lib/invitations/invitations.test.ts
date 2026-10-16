import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/config", () => ({ getSiteUrl: () => "http://localhost:3000", isLocalAuth: () => true }));
import { invitationConfiguration, invitationDeliveryMode } from "./configuration";
import { invitationMessage } from "./message";
import { invitationRequestSchema } from "./schemas";
const variables = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "INVITATION_FROM", "INVITATION_SITE_URL", "RESEND_API_KEY", "INVITATION_EMAIL_TRANSPORT"];
beforeEach(() => { for (const key of variables) vi.stubEnv(key, undefined); });
afterEach(() => vi.unstubAllEnvs());
describe("invitation configuration", () => {
  it("captures local test email without any paid provider credentials", () => {
    expect(invitationConfiguration()).toEqual({ kind: "mailpit", siteUrl: "http://localhost:3000", from: "invites@studyspree.local" });
  });
  it("can force isolated local capture without consuming a configured provider's allowance", () => {
    vi.stubEnv("INVITATION_EMAIL_TRANSPORT", "mailpit");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    expect(invitationConfiguration().kind).toBe("mailpit");
  });
  it("uses authenticated Gmail SMTP with the existing mailbox as sender", () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com"); vi.stubEnv("SMTP_USER", "sender@gmail.com"); vi.stubEnv("SMTP_PASS", "application-password"); vi.stubEnv("INVITATION_SITE_URL", "https://study.example.test");
    expect(invitationConfiguration()).toMatchObject({ kind: "smtp", host: "smtp.gmail.com", port: 465, from: "sender@gmail.com" });
  });
  it("rejects incomplete SMTP configuration instead of silently capturing real email", () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    expect(invitationDeliveryMode()).toBe("unavailable");
  });
  it("requires a public HTTPS invitation address for external email", () => {
    vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("INVITATION_FROM", "invites@example.test");
    expect(invitationDeliveryMode()).toBe("unavailable");
    vi.stubEnv("INVITATION_SITE_URL", "https://localhost");
    expect(invitationDeliveryMode()).toBe("unavailable");
    vi.stubEnv("INVITATION_SITE_URL", "https://study.example.test");
    expect(invitationDeliveryMode()).toBe("resend");
  });
});
describe("invitation content", () => {
  it("escapes sender content and links to registration, never a privileged login token", () => {
    const message = invitationMessage('<script>\r\nAlex</script>', "en", "https://study.example.test");
    expect(message.subject).not.toContain("\n");
    expect(message.html).not.toContain("<script>");
    expect(message.text).toContain("https://study.example.test/login?invite=1");
    expect(message.text).not.toContain("access_token");
  });
  it.each(["en", "de", "fr", "pl", "it"] as const)("resolves email copy in %s", locale => {
    expect(invitationMessage("Alex", locale, "https://study.example.test").text).not.toMatch(/invitations\.\w+/);
  });
  it("rejects email injection, unknown fields and unsupported languages", () => {
    const input = { email: "friend@example.test", locale: "en", requestId: "90000000-0000-4000-8000-000000000001" };
    expect(invitationRequestSchema.parse(input).email).toBe(input.email);
    expect(invitationRequestSchema.safeParse({ ...input, email: "friend@example.test\r\nBcc: other@example.test" }).success).toBe(false);
    expect(invitationRequestSchema.safeParse({ ...input, from: "forged@example.test" }).success).toBe(false);
    expect(invitationRequestSchema.safeParse({ ...input, locale: "xx" }).success).toBe(false);
  });
});
