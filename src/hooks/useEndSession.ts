"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";
import { useSessionStore } from "@/stores/sessionStore";

export type EndSessionInput = { id: string; reason: "completed" | "stopped_early" };

export function useEndSession() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ id, reason }: EndSessionInput) => repo.endSession(id, reason),
    onMutate: () => { useSessionStore.getState().setFinishing(true); },
    onError: () => { useSessionStore.getState().setFinishing(false); },
    onSuccess: async ({ session }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.activeSession() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.streak() }),
      ]);
      router.push(`/session/${session.id}/complete`);
    },
  });
}
