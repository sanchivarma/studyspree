import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { useCompletionSummary, type CompletionSummary } from "./useCompletionSummary";
import { useCompletionStore } from "@/stores/completionStore";
import { repo } from "@/lib/repo";
import type { Profile } from "@/types/domain";
import type { EndSessionResult } from "@/lib/repo/types";

vi.mock("@/lib/clock", () => ({ now: () => new Date("2026-10-14T12:00:00Z") }));
vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn(), useQueryClient: () => ({ getQueryData: () => undefined }) }));
vi.mock("@/lib/repo", () => ({ repo: { getSessions: vi.fn(), getProfile: vi.fn(), endSession: vi.fn(), getDayStats: vi.fn() } }));
const profile: Profile = { soloScene: {desk:"modern",window:"green-nature"}, mirrorSelfView:true,showOwnTile:true,shareNowPlaying:false,leaderboardOptIn:false, displayName: "Alex", timezone: "UTC", selectedTheme: "rain-desk", showStreak: true, reduceMotion: true, webcamEnabled: false, webcamCorner: "bottom-right", ambienceEnabled: false, musicTrack: null, musicVolume: 0, roomVolume: 0, comebackShownForDate: null, companionPreferences: { mode: "solo", characterSlugs: [] } };
const result: EndSessionResult = { session: { id: "test", startedAt: "2026-10-14T11:59:50Z", endedAt: "2026-10-14T12:00:00Z", localDate: "2026-10-14", plannedMinutes: 5, actualSeconds: 10, endedReason: "stopped_early", themeSlug: "rain-desk", task: null, companions: { mode: "solo", characterSlugs: [] } }, totalSecondsAllTime: 10, dayTotalSeconds: 10, streak: { current: 2, best: 9, changed: true, freezeUsed: true } };
function options() { return vi.mocked(useQuery).mock.calls.at(-1)![0] as unknown as { initialData?: CompletionSummary; queryFn: () => Promise<CompletionSummary | null> }; }
beforeEach(() => {
  vi.clearAllMocks(); useCompletionStore.getState().clear();
  vi.mocked(repo.getProfile).mockResolvedValue(profile);
  vi.mocked(repo.getSessions).mockResolvedValue([result.session]);
  vi.mocked(repo.endSession).mockResolvedValue(result);
  vi.mocked(repo.getDayStats).mockResolvedValue([{ date: "2026-10-14", totalSeconds: 10, sessionCount: 1 }]);
});
describe("completion summary read paths", () => {
  it("provides a complete first render from the Finish receipt without waiting for a query", () => {
    useCompletionStore.getState().remember({ ...result, profile, today: "2026-10-14", todayTotalSeconds: 10 });
    useCompletionSummary("test");
    expect(options().initialData).toMatchObject({ ...result, profile });
    expect(repo.getSessions).not.toHaveBeenCalled();
  });
  it("restores persisted flags through an idempotent read on refresh", async () => {
    useCompletionSummary("test");
    expect(options().initialData).toBeUndefined();
    expect(await options().queryFn()).toMatchObject({ ...result, profile });
    expect(repo.endSession).toHaveBeenCalledExactlyOnceWith("test", "stopped_early");
  });
  it("uses today's bucket rather than the receipt's start date across midnight", () => {
    useCompletionStore.getState().remember({ ...result, session: { ...result.session, localDate: "2026-10-13" }, profile, today: "2026-10-14", todayTotalSeconds: 0 });
    useCompletionSummary("test"); expect(options().initialData?.dayTotalSeconds).toBe(0);
  });
  it.each([{ ...result.session, endedAt: null }, { ...result.session, id: "other" }])("never finishes an active or mismatched session while restoring a receipt", async (session) => {
      vi.mocked(repo.getSessions).mockResolvedValue([session]);
      useCompletionSummary("test"); expect(await options().queryFn()).toBeNull();
    expect(repo.endSession).not.toHaveBeenCalled();
  });
});
