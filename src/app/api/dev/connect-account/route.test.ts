import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ email: vi.fn(), profile: vi.fn(), login: vi.fn() }));
vi.mock("@/lib/auth/connectedDevAccount", () => ({ connectedDevAccountEmail: mocks.email }));
vi.mock("@/lib/auth/devAdmin", () => ({ getDevAdminProfile: mocks.profile, loginDevAdmin: mocks.login }));
import { GET } from "./route";
beforeEach(() => { vi.resetAllMocks(); mocks.email.mockReturnValue("ss_admin@local.studyspree.test"); vi.stubEnv("DEV_ADMIN_PASSWORD", "local-test-password"); });
afterEach(() => vi.unstubAllEnvs());
it("requires an enabled local instance and a verified preview cookie", async () => {
  mocks.email.mockReturnValue(null);
  expect((await GET(new Request("http://localhost/api/dev/connect-account"))).status).toBe(404);
  mocks.email.mockReturnValue("ss_admin@local.studyspree.test");
  expect((await GET(new Request("https://external.example/api/dev/connect-account"))).status).toBe(404);
  mocks.profile.mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api/dev/connect-account"))).headers.get("location")).toBe("http://localhost/login");
  expect(mocks.login).not.toHaveBeenCalled();
});
it("connects a verified preview and preserves the local setup route", async () => {
  mocks.profile.mockResolvedValue({ username: "ss_admin" }); mocks.login.mockResolvedValue({ status: "success", navigate: "/" });
  const response = await GET(new Request("http://localhost/api/dev/connect-account?next=%2Fstudy%3Fmode%3Dpeople"));
  expect(response.headers.get("location")).toBe("http://localhost/study?mode=people");
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("does not redirect to an external site or conceal failed authentication", async () => {
  mocks.profile.mockResolvedValue({ username: "ss_admin" }); mocks.login.mockResolvedValue({ status: "success", navigate: "/" });
  expect((await GET(new Request("http://localhost/api/dev/connect-account?next=https://external.example"))).headers.get("location")).toBe("http://localhost/");
  mocks.login.mockResolvedValue({ status: "error" });
  expect((await GET(new Request("http://localhost/api/dev/connect-account"))).status).toBe(503);
});
