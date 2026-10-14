import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useUpdateProfile } from "./useUpdateProfile";
import { useProfileMutation } from "./useProfileMutation";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile } from "@/types/domain";

const state = vi.hoisted(() => ({ client: null as QueryClient | null }));
vi.mock("@tanstack/react-query", async original => ({
  ...await original<typeof import("@tanstack/react-query")>(),
  useQueryClient: () => state.client,
  useMutation: vi.fn(options => options),
}));
vi.mock("@/lib/repo", () => ({ repo: { updateProfile: vi.fn() } }));
type Context = { previous: Profile | undefined; patch: Partial<Profile>; edit: symbol };
type Options = UseMutationOptions<Profile, Error, Partial<Profile>, Context>;
const original: Profile = { displayName: "Sanchi", selectedCharacter: "rain-desk", timezone: "Europe/Berlin", showStreak: true,
  reduceMotion: false, webcamEnabled: false, webcamCorner: "bottom-right", ambienceEnabled: false,
  musicTrack: null, musicVolume: 0, roomVolume: 0, comebackShownForDate: null };
let options: Options;
beforeEach(() => {
  vi.clearAllMocks(); state.client = new QueryClient(); state.client.setQueryData(queryKeys.profile(), original);
  useUpdateProfile(); options = vi.mocked(useMutation).mock.calls.at(-1)![0] as Options;
});

it.each<Partial<Profile>>([
  { displayName: "Alex" }, { timezone: "Asia/Tokyo" }, { reduceMotion: true }, { ambienceEnabled: true },
  { musicVolume: .4 }, { roomVolume: .6 }, { webcamEnabled: true }, { showStreak: false }, { selectedCharacter: "dorm-bunk" },
])("optimistically updates and rolls back %j through the repository", async patch => {
  const context = await options.onMutate!(patch, {} as never);
  expect(state.client!.getQueryData(queryKeys.profile())).toEqual({ ...original, ...patch });
  vi.mocked(repo.updateProfile).mockRejectedValue(new Error("storage"));
  await expect(options.mutationFn!(patch, {} as never)).rejects.toThrow("storage");
  expect(repo.updateProfile).toHaveBeenCalledWith(patch);
  await options.onError!(new Error("storage"), patch, context, {} as never);
  expect(state.client!.getQueryData(queryKeys.profile())).toEqual(original);
});
it("rollback preserves a newer choice and a different edited field", async () => {
  const first = { musicVolume: .2, roomVolume: .3 };
  const context = await options.onMutate!(first, {} as never);
  await options.onMutate!({ musicVolume: .8, displayName: "Alex" }, {} as never);
  await options.onError!(new Error("storage"), first, context, {} as never);
  expect(state.client!.getQueryData(queryKeys.profile())).toEqual({ ...original, musicVolume: .8, displayName: "Alex" });
});
it("an earlier response never erases another optimistic edit", async () => {
  const patch = { showStreak: false };
  const context = await options.onMutate!(patch, {} as never);
  await options.onMutate!({ reduceMotion: true }, {} as never);
  await options.onSuccess!({ ...original, ...patch }, patch, context!, {} as never);
  expect(state.client!.getQueryData(queryKeys.profile())).toEqual({ ...original, showStreak: false, reduceMotion: true });
});
it("an earlier rejection retains a newer edit even when its value matches", async () => {
  const patch = { musicVolume: .2 };
  const context = await options.onMutate!(patch, {} as never);
  await options.onMutate!({ musicVolume: .5 }, {} as never);
  await options.onMutate!(patch, {} as never);
  await options.onError!(new Error("storage"), patch, context, {} as never);
  expect(state.client!.getQueryData<Profile>(queryKeys.profile())!.musicVolume).toBe(.2);
});
it("permission rejection prevents persistence and rolls back the opt-in", async () => {
  useProfileMutation((patch: Partial<Profile>) => patch, async () => { throw new DOMException("Denied", "NotAllowedError"); });
  options = vi.mocked(useMutation).mock.calls.at(-1)![0] as Options;
  const patch = { webcamEnabled: true };
  const context = await options.onMutate!(patch, {} as never);
  await expect(options.mutationFn!(patch, {} as never)).rejects.toThrow("Denied");
  await options.onError!(new Error("Denied"), patch, context, {} as never);
  expect(repo.updateProfile).not.toHaveBeenCalled();
  expect(state.client!.getQueryData<Profile>(queryKeys.profile())!.webcamEnabled).toBe(false);
});
