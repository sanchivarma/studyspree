import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ value: undefined as string | undefined, remove: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.value ? { value: mocks.value } : undefined, delete: mocks.remove }) }));
import { consumeAuthReturnTo, readAuthReturnTo } from "./returnToServer";
beforeEach(() => { mocks.value = undefined; vi.clearAllMocks(); });
it("retains a pending joining URL until it is consumed after sign-in/onboarding", async () => {
  mocks.value = "/rooms/8a000000-0000-4000-8000-000000000001";
  expect(await readAuthReturnTo()).toBe(mocks.value); expect(mocks.remove).not.toHaveBeenCalled();
  expect(await consumeAuthReturnTo()).toBe(mocks.value); expect(mocks.remove).toHaveBeenCalledWith("ss_auth_return");
});
it("clears an unsafe destination and falls back to Home", async () => {
  mocks.value = "//other.example"; expect(await consumeAuthReturnTo()).toBe("/"); expect(mocks.remove).toHaveBeenCalled();
});
