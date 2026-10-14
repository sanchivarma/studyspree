"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";
import type { StartSessionInput } from "@/lib/repo/types";
import { useSessionStore } from "@/stores/sessionStore";
import type { Session } from "@/types/domain";
import { useCompletionStore } from "@/stores/completionStore";

export function useStartSession(onStarted?: (session: Session) => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: StartSessionInput) => repo.startSession(input),
    onSuccess: async (session) => {
      useCompletionStore.getState().clear();
      onStarted?.(session);
      useSessionStore.getState().setFinishing(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.activeSession() });
      router.push(`/session/${session.id}`);
    },
  });
}
