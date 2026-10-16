import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ profile: vi.fn(), preview: vi.fn(), config: vi.fn(), deliver: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/repo/authRepository", () => ({ authRepository: { getProfile: mock.profile } }));
vi.mock("@/lib/auth/devAdmin", () => ({ getDevAdminProfile: mock.preview }));
vi.mock("@/lib/auth/server", () => ({ createAuthClient: async () => ({ rpc: mock.rpc }) }));
vi.mock("./configuration", () => ({ invitationConfiguration: mock.config }));
vi.mock("./delivery", () => ({ deliverInvitation: mock.deliver }));
import { sendInvitation } from "./server";
const input = () => ({ email: "friend@example.test", locale: "en" as const, requestId: crypto.randomUUID() });
beforeEach(() => {
  vi.resetAllMocks();
  mock.profile.mockResolvedValue({ id: "84000000-0000-4000-8000-000000000001", username: "reader", display_name: "Reader" });
  mock.preview.mockResolvedValue(null);
  mock.config.mockReturnValue({ kind: "mailpit", from: "invites@studyspree.local", siteUrl: "http://localhost:3000" });
  mock.rpc.mockResolvedValue({ data: true, error: null });
  mock.deliver.mockResolvedValue("captured");
});
it("requires authentication before inspecting sender configuration or sending mail", async () => {
  mock.profile.mockResolvedValue(null);
  await expect(sendInvitation(input())).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  expect(mock.deliver).not.toHaveBeenCalled();
  expect(mock.config).not.toHaveBeenCalled();
});
it("allows authenticated preview invitations without impersonating a database user", async () => {
  mock.preview.mockResolvedValue({ username: `preview_${crypto.randomUUID()}` });
  await expect(sendInvitation(input())).resolves.toEqual({ delivery: "captured" });
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("limits preview sends by username, and rejects a duplicated request", async () => {
  mock.preview.mockResolvedValue({ username: `preview_${crypto.randomUUID()}` });
  const first = input();
  await sendInvitation(first);
  await expect(sendInvitation(first)).rejects.toMatchObject({ code: "duplicate", status: 409 });
  for (let count = 0; count < 4; count++) await sendInvitation(input());
  await expect(sendInvitation(input())).rejects.toMatchObject({ code: "rateLimited", status: 429 });
  expect(mock.deliver).toHaveBeenCalledTimes(5);
});
it("reserves regular-account mail with a recipient hash, not plaintext addresses", async () => {
  const request = input(); await sendInvitation(request);
  expect(mock.rpc).toHaveBeenCalledWith("reserve_email_invitation", { p_id: request.requestId, p_recipient_hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
});
it("does not send when configuration or the account's rate limit rejects the request", async () => {
  mock.config.mockImplementationOnce(() => { throw new Error("Missing sender credentials"); });
  await expect(sendInvitation(input())).rejects.toMatchObject({ code: "notConfigured", status: 503 });
  mock.rpc.mockResolvedValue({ error: { code: "P0001" } });
  await expect(sendInvitation(input())).rejects.toMatchObject({ code: "rateLimited", status: 429 });
  expect(mock.deliver).not.toHaveBeenCalled();
});
it("surfaces delivery errors without disclosing credentials or claiming success", async () => {
  mock.deliver.mockRejectedValue(new Error("private SMTP password detail"));
  await expect(sendInvitation(input())).rejects.toMatchObject({ code: "unavailable", status: 503, message: "unavailable" });
});
