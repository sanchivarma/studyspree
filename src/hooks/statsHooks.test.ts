import { beforeEach, expect, it, vi } from "vitest";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTotalSeconds } from "./useTotalSeconds";
import { useDayStats } from "./useDayStats";
import { useStreak } from "./useStreak";
import { useSessionSummary } from "./useSessionSummary";
import { useSessions } from "./useSessions";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { Session } from "@/types/domain";

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn(() => ({})), useInfiniteQuery: vi.fn(() => ({})) }));
vi.mock("@/lib/repo", () => ({ repo: { getTotalSecondsAllTime: vi.fn(), getDayStats: vi.fn(), getStreak: vi.fn(), getSessionSummary: vi.fn(), getSessions: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it("uses shared keys, repository reads and five-minute freshness", async () => {
  useTotalSeconds(); useDayStats("2026-01-01", "2026-12-31"); useStreak(); useSessionSummary();
  const keys = [queryKeys.stats.total(), queryKeys.stats.days("2026-01-01", "2026-12-31"), queryKeys.streak(), queryKeys.stats.summary()];
  for (const [index, [options]] of vi.mocked(useQuery).mock.calls.entries()) {
    expect(options.queryKey).toEqual(keys[index]); expect(options.staleTime).toBe(300000);
    await (options.queryFn as () => Promise<unknown>)();
  }
  expect(repo.getTotalSecondsAllTime).toHaveBeenCalledWith();
  expect(repo.getDayStats).toHaveBeenCalledWith("2026-01-01", "2026-12-31");
  expect(repo.getStreak).toHaveBeenCalledWith(); expect(repo.getSessionSummary).toHaveBeenCalledWith();
});
it("waits for the explicit profile date before querying day buckets", () => {
  useDayStats("1970-01-01", "1970-01-01", false);
  expect(vi.mocked(useQuery).mock.calls[0][0].enabled).toBe(false);
});
it("pages twenty ended sessions without gaps or duplicate rows when an active record is present", async () => {
  const records: Session[] = Array.from({ length: 22 }, (_, index) => ({
    id: `session-${index}`, startedAt: "2026-10-14T12:00:00Z", endedAt: index === 0 ? null : "2026-10-14T12:01:00Z",
    plannedMinutes: 5, actualSeconds: index === 0 ? 0 : 60, endedReason: index === 0 ? null : "completed",
    characterSlug: "rain-desk", localDate: "2026-10-14", task: null,
  }));
  vi.mocked(repo.getSessions).mockResolvedValue(records);
  useSessions();
  const options = vi.mocked(useInfiniteQuery).mock.calls[0][0];
  const query = options.queryFn as (context: { pageParam: number }) => Promise<{ sessions: Session[]; nextOffset: number | undefined }>;
  const next = options.getNextPageParam as (page: Awaited<ReturnType<typeof query>>) => number | undefined;
  const first = await query({ pageParam: 0 });
  expect(options.queryKey).toEqual(queryKeys.stats.history(20)); expect(options.staleTime).toBe(300000);
  expect(first.sessions).toHaveLength(20); expect(first.sessions[0].id).toBe("session-1");
  expect(next(first)).toBe(21);
  vi.mocked(repo.getSessions).mockResolvedValue(records.slice(21));
  const last = await query({ pageParam: 21 });
  expect(repo.getSessions).toHaveBeenLastCalledWith({ limit: 22, offset: 21 });
  expect(last.sessions.map((session) => session.id)).toEqual(["session-21"]); expect(next(last)).toBeUndefined();
});
