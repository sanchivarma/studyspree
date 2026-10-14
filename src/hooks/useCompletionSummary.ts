"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import { isRecentCompletion } from "@/lib/session/completion";
import type { Profile, Session } from "@/types/domain";

export type CompletionSummary = { session: Session; profile: Profile; totalSecondsAllTime: number; dayTotalSeconds: number };

export function useCompletionSummary(id: string) {
  return useQuery({ queryKey: queryKeys.stats.completion(id), staleTime: 0, queryFn: async (): Promise<CompletionSummary | null> => {
    const [sessions, profile] = await Promise.all([repo.getSessions({ limit: 1, offset: 0 }), repo.getProfile()]);
    const session = sessions[0];
    if (!session || session.id !== id || !isRecentCompletion(session, now().getTime())) return null;
    const today = toLocalDate(now(), profile.timezone);
    const [totalSecondsAllTime, days] = await Promise.all([repo.getTotalSecondsAllTime(), repo.getDayStats(today, today)]);
    return { session, profile, totalSecondsAllTime, dayTotalSeconds: days.find((day) => day.date === today)?.totalSeconds ?? 0 };
  } });
}
