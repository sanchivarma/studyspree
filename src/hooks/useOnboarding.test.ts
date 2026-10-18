import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ mutation: vi.fn(), authenticate: vi.fn(), update: vi.fn(), set: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useMutation: mocks.mutation, useQueryClient: () => ({ setQueryData: mocks.set }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/app/(auth)/actions", () => ({ authenticate: mocks.authenticate }));
vi.mock("@/lib/repo", () => ({ repo: { updateProfile: mocks.update } }));
import { useOnboarding } from "./useOnboarding";
import type { OnboardingInput } from "@/lib/auth/schemas";
const input: OnboardingInput = { displayName: "Reader", timezone: "UTC", selectedTheme: "rain-desk", showStreak: true, reduceMotion: false };
beforeEach(() => { vi.clearAllMocks(); mocks.update.mockResolvedValue({ displayName: "Reader" }); });
it("uses the verified joining destination returned by onboarding", async () => {
  const destination = "/rooms/8a000000-0000-4000-8000-000000000001";
  mocks.authenticate.mockResolvedValue({ status: "success", navigate: destination }); useOnboarding();
  const options = mocks.mutation.mock.calls[0][0]; const result = await options.mutationFn(input); options.onSuccess(result);
  expect(mocks.replace).toHaveBeenCalledWith(destination); expect(mocks.set).toHaveBeenCalled();
});
it("does not write a local profile or navigate after rejected onboarding", async () => {
  mocks.authenticate.mockResolvedValue({ status: "error" }); useOnboarding();
  await expect(mocks.mutation.mock.calls[0][0].mutationFn(input)).rejects.toThrow();
  expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.replace).not.toHaveBeenCalled();
});
