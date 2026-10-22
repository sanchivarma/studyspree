"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";
import { useSessionStore } from "@/stores/sessionStore";
import { useCompletionStore } from "@/stores/completionStore";
import type { Profile, Session } from "@/types/domain";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import { clearClientSelections } from "@/lib/session/clearClientSelections";

export type EndSessionInput = { id: string; reason: "completed" | "stopped_early" };

export function useEndSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ id, reason }: EndSessionInput) => repo.endSession(id, reason),
    onMutate: () => { useSessionStore.getState().setFinishing(true); },
    onError: () => { useSessionStore.getState().setFinishing(false); },
    onSuccess: async (result) => {
      const profile = queryClient.getQueryData<Profile>(queryKeys.profile()) ?? await repo.getProfile();
      const today = toLocalDate(now(), profile.timezone);
      const todayTotalSeconds = today === result.session.localDate ? result.dayTotalSeconds
        : (await repo.getDayStats(today, today)).find(day => day.date === today)?.totalSeconds ?? 0;
      useCompletionStore.getState().remember({ ...result, profile, today, todayTotalSeconds });
      const { session } = result;
      // Banked values come from the repository. Seed the lifetime hero before
      // routing, so a slow background query cannot hold Finish or show less time.
      queryClient.setQueryData<number>(queryKeys.stats.total(), current => Math.max(current ?? 0, result.totalSecondsAllTime));
      queryClient.setQueryData<Session | null>(queryKeys.activeSession(), current => current?.id === session.id ? null : current);
      queryClient.setQueryData(queryKeys.stats.session(session.id), session);
      clearClientSelections(queryClient, session.id);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.activeSession() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.streak() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.achievements() }),
      ]);
      router.push(`/session/${session.id}/complete`);
    },
  });
}
