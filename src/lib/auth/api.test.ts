import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/repo/authRepository", () => ({ authRepository: { execute: mock.execute } }));
import { POST as username } from "@/app/api/auth/username/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
let address = 0;
function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/register", { method: "POST", headers: { origin, "Content-Type": "application/json", "x-forwarded-for": `test-${address}` }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.resetAllMocks(); address++; });
it.each([username, register, login])("rejects foreign origins and malformed JSON before authentication", async handler => {
  expect((await handler(request({}, "https://other.test"))).status).toBe(403);
  expect((await handler(new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
  expect(mock.execute).not.toHaveBeenCalled();
});
it.each([[username, "checkUsername"], [register, "register"], [login, "login"]] as const)("dispatches the dedicated endpoint without page actions", async (handler, operation) => {
  mock.execute.mockResolvedValue({ status: "success" });
  const response = await handler(request({ username: "alex" }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("server-timing")).toMatch(/^auth;dur=/);
  expect(mock.execute).toHaveBeenCalledWith(operation, { username: "alex" });
});
it("keeps duplicate usernames and invalid credentials distinct", async () => {
  mock.execute.mockResolvedValue({ status: "error", fieldErrors: { username: "register.usernameTaken" } });
  expect((await username(request({ username: "alex" }))).status).toBe(422);
  mock.execute.mockResolvedValue({ status: "error", message: "login.invalidCredentials" });
  expect((await login(request({ username: "alex", password: "wrong" }))).status).toBe(401);
});
it("does not expose internal errors or claim success when dependencies are unavailable", async () => {
  mock.execute.mockRejectedValue(new Error("private credentials"));
  const response = await register(request({}));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "error", message: "common.authError" });
});
it("limits repeated username checks", async () => {
  mock.execute.mockResolvedValue({ status: "success" });
  for (let i = 0; i < 30; i++) expect((await username(request({ username: "alex" }))).status).toBe(200);
  expect((await username(request({ username: "alex" }))).status).toBe(429);
  expect(mock.execute).toHaveBeenCalledTimes(30);
});
