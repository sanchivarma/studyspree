import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient, useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useSelectCharacter } from "./useSelectCharacter";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";
import type { Profile } from "@/types/domain";
import type { CharacterSlug } from "@/lib/characters/registry";

const state = vi.hoisted(() => ({ client: null as QueryClient | null }));
vi.mock("@tanstack/react-query", async (original) => ({
  ...await original<typeof import("@tanstack/react-query")>(),
  useQueryClient: () => state.client,
  useMutation: vi.fn((options) => options),
}));
vi.mock("@/lib/repo", () => ({ repo: { updateProfile: vi.fn() } }));
type Context = { previous: Profile | undefined; selectedCharacter: CharacterSlug };
type Options = UseMutationOptions<Profile, Error, CharacterSlug, Context>;
const original: Profile = { displayName: "Sanchi", selectedCharacter: "rain-desk", timezone: "Europe/Berlin", showStreak: true, reduceMotion: false, webcamEnabled: false, webcamCorner: "bottom-right", ambienceEnabled: false, musicTrack: null, musicVolume: 0, roomVolume: 0, comebackShownForDate: null };
let options: Options;
beforeEach(() => {
  vi.clearAllMocks(); state.client = new QueryClient();
  state.client.setQueryData(queryKeys.profile(), original);
  useSelectCharacter();
  options = vi.mocked(useMutation).mock.calls.at(-1)![0] as Options;
});

it("optimistically changes the character while retaining every other profile field", async () => {
  const context = await options.onMutate!("night-shift", {} as never);
  expect(state.client!.getQueryData(queryKeys.profile())).toEqual({ ...original, selectedCharacter: "night-shift" });
  expect(context?.previous).toEqual(original);
});
it("writes the profile through the repository, without writing a session", async () => {
  vi.mocked(repo.updateProfile).mockResolvedValue({ ...original, selectedCharacter: "dorm-bunk" });
  await options.mutationFn!("dorm-bunk", {} as never);
  expect(repo.updateProfile).toHaveBeenCalledWith({ selectedCharacter: "dorm-bunk" });
});
it("rolls back an unsuccessful save", async () => {
  const context = await options.onMutate!("night-shift", {} as never);
  await options.onError!(new Error("storage"), "night-shift", context, {} as never);
  expect(state.client!.getQueryData(queryKeys.profile())).toEqual(original);
});
it("an older unsuccessful save does not overwrite a newer optimistic choice", async () => {
  const context = await options.onMutate!("night-shift", {} as never);
  await options.onMutate!("dorm-bunk", {} as never);
  await options.onError!(new Error("storage"), "night-shift", context, {} as never);
  expect(state.client!.getQueryData(queryKeys.profile())).toEqual({ ...original, selectedCharacter: "dorm-bunk" });
});
