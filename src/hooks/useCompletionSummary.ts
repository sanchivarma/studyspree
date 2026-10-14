"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import { isRecentCompletion } from "@/lib/session/completion";
import type { Profile, Session } from "@/types/domain";
import type { EndSessionStreak } from "@/lib/repo/types";
import { getCompletionReceipt } from "@/stores/completionStore";

export type CompletionSummary = { session: Session; profile: Profile; totalSecondsAllTime: number; dayTotalSeconds: number; streak: EndSessionStreak };

export function useCompletionSummary(id: string) {
  const client = useQueryClient();
  const receipt = getCompletionReceipt(id);
  const profile = client.getQueryData<Profile>(queryKeys.profile()) ?? receipt?.profile;
  const today = profile ? toLocalDate(now(), profile.timezone) : null;
  const days = today ? client.getQueryData<{ date: string; totalSeconds: number }[]>(queryKeys.stats.days(today, today)) : undefined;
  const initialData = receipt && profile ? {
    ...receipt, profile,
    dayTotalSeconds: today === receipt.today
      ? receipt.todayTotalSeconds ?? 0
      : today === receipt.session.localDate
        ? receipt.dayTotalSeconds
        : days?.find(day => day.date === today)?.totalSeconds ?? 0,
  } : undefined;
  return useQuery({ queryKey: queryKeys.stats.completion(id), initialData, staleTime: 0, queryFn: async (): Promise<CompletionSummary | null> => {
    const [sessions, profile] = await Promise.all([repo.getSessions({ limit: 1, offset: 0 }), repo.getProfile()]);
    const session = sessions[0];
    if (!session || session.id !== id || !isRecentCompletion(session, now().getTime())) return null;
    const today = toLocalDate(now(), profile.timezone);
    // Ending an ended session is an idempotent repository read. It restores the
    // original changed/freezeUsed flags after refresh without applying activity again.
    const [result, days] = await Promise.all([repo.endSession(session.id, session.endedReason!), repo.getDayStats(today, today)]);
    return { ...result, profile, dayTotalSeconds: days.find((day) => day.date === today)?.totalSeconds ?? 0 };
  } });
}
