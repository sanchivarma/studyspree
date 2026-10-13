"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import { computeCurrentStreak } from "@/lib/streaks/computeCurrentStreak";
import type { Profile, Session } from "@/types/domain";

export type CompletionSummary = { session: Session; profile: Profile; totalSecondsAllTime: number; dayTotalSeconds: number; currentStreak: number };

export function useCompletionSummary(id: string) {
  return useQuery({ queryKey: queryKeys.stats.completion(id), queryFn: async (): Promise<CompletionSummary | null> => {
    const [sessions, profile] = await Promise.all([repo.getSessions({ limit: Number.MAX_SAFE_INTEGER, offset: 0 }), repo.getProfile()]);
    const session = sessions.find((value) => value.id === id);
    if (!session) return null;
    const today = toLocalDate(now(), profile.timezone);
    const [totalSecondsAllTime, days] = await Promise.all([repo.getTotalSecondsAllTime(), repo.getDayStats("0001-01-01", today)]);
    return { session, profile, totalSecondsAllTime, dayTotalSeconds: days.find((day) => day.date === today)?.totalSeconds ?? 0,
      currentStreak: computeCurrentStreak(days, today) };
  } });
}
