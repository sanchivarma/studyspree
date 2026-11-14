import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/app/(auth)/actions", () => ({ authenticate: vi.fn() }));
import { executeAuth } from "./authTransport";
afterEach(() => vi.unstubAllGlobals());
it("checks the username before posting account creation to its own API", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ status: "success" })).mockResolvedValueOnce(Response.json({ status: "success", message: "register.checkEmail" }));
  vi.stubGlobal("fetch", fetcher);
  const input = { username: "alex", email: "alex@example.test", password: "password" };
  await executeAuth("register", input);
  expect(fetcher.mock.calls.map(call => call[0])).toEqual(["/api/auth/username", "/api/auth/register"]);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ username: "alex" });
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(input);
});
it("does not create an account when the username is taken", async () => {
  const result = { status: "error", fieldErrors: { username: "register.usernameTaken" } };
  const fetcher = vi.fn().mockResolvedValue(Response.json(result, { status: 422 }));
  vi.stubGlobal("fetch", fetcher);
  expect(await executeAuth("register", { username: "alex" })).toEqual(result);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("posts login directly to the login API", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ status: "success", navigate: "/" }));
  vi.stubGlobal("fetch", fetcher);
  await executeAuth("login", { username: "alex", password: "password" });
  expect(fetcher).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
});
it("posts sign out to its API rather than a page action", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ status: "success", navigate: "/login" }));
  vi.stubGlobal("fetch", fetcher);
  await executeAuth("logout");
  expect(fetcher).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST", body: "{}" }));
});
