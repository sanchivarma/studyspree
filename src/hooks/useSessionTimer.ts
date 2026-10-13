"use client";

import { useLayoutEffect, useRef } from "react";
import { repo } from "@/lib/repo";
import { startSessionTimer, type CompletionGuard } from "@/lib/session/timer";
import { useSessionStore } from "@/stores/sessionStore";
import type { Session } from "@/types/domain";
import { useEndSession } from "./useEndSession";

export function useSessionTimer(session: Session) {
  const { mutate: endSession } = useEndSession();
  const completion = useRef<(CompletionGuard & { id: string }) | null>(null);
  const { id, startedAt, plannedMinutes, endedAt } = session;

  useLayoutEffect(() => {
    if (completion.current?.id !== id) {
      completion.current = { id, requested: false };
      useSessionStore.getState().setFinishing(false);
    }
    return startSessionTimer({ id, startedAt, plannedMinutes, endedAt }, {
      setTick: (elapsed, remaining) => useSessionStore.getState().setTick(elapsed, remaining),
      isFinishing: () => useSessionStore.getState().isFinishing,
      finish: () => {
        useSessionStore.getState().setFinishing(true);
        endSession({ id, reason: "completed" });
      },
      heartbeat: () => repo.heartbeat(id),
    }, completion.current);
  }, [id, startedAt, plannedMinutes, endedAt, endSession]);

  return useSessionStore();
}
