import { now } from "@/lib/clock";
import type { Session } from "@/types/domain";

export type CompletionGuard = { requested: boolean };
type TimerActions = {
  setTick: (elapsed: number, remaining: number | null) => void;
  isFinishing: () => boolean;
  finish: () => void;
  heartbeat: () => Promise<void>;
};

// The hook owns this lifecycle. Extracted so sleep/visibility behavior can be
// exercised with fake timers without adding a DOM testing dependency.
export function startSessionTimer(session: Pick<Session, "id" | "startedAt" | "plannedMinutes" | "endedAt">, actions: TimerActions, completion: CompletionGuard) {
  const startedAt = new Date(session.startedAt).getTime();
  let previousTick: number | null = null;
  let lastHeartbeat = now().getTime();
  let interval: ReturnType<typeof setInterval> | undefined;

  const tick = () => {
    const timestamp = now().getTime();
    if (previousTick !== null && timestamp - previousTick > 120_000) {
      console.debug("Session timer resumed after a suspension", { id: session.id, gapSeconds: (timestamp - previousTick) / 1000 });
    }
    previousTick = timestamp;
    const elapsed = Math.max(0, Math.floor((timestamp - startedAt) / 1000));
    const remaining = session.plannedMinutes === null ? null : session.plannedMinutes * 60 - elapsed;
    actions.setTick(elapsed, remaining === null ? null : Math.max(0, remaining));
    if (session.endedAt !== null) return;
    if (remaining !== null && remaining <= 0 && !completion.requested && !actions.isFinishing()) {
      completion.requested = true;
      actions.finish();
    }
    if (!completion.requested && !actions.isFinishing() && timestamp - lastHeartbeat >= 60_000) {
      lastHeartbeat = timestamp;
      void actions.heartbeat().catch((error: unknown) => console.debug("Session heartbeat unavailable", error));
    }
  };
  const pause = () => { if (interval !== undefined) clearInterval(interval); interval = undefined; };
  const schedule = () => {
    pause();
    if (!document.hidden && session.endedAt === null) interval = setInterval(tick, 1000);
  };
  const onVisibilityChange = () => {
    if (!document.hidden) tick();
    schedule();
  };

  tick(); // Publish the first display value before waiting for an interval.
  schedule();
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => { pause(); document.removeEventListener("visibilitychange", onVisibilityChange); };
}
