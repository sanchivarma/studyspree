import { differenceInCalendarDays, parseISO } from "date-fns";
import type { StreakState } from "./computeStreak";

/** Reading progress never rewrites the stored best or spends a freeze. */
export function currentStreak(state: StreakState, today: string): number {
  if (state.lastActiveDate === null) return 0;
  const gap = differenceInCalendarDays(parseISO(today), parseISO(state.lastActiveDate));
  const freezesAvailable = today >= state.freezesResetAt ? 2 : state.freezesRemaining;
  return gap > 2 || (gap === 2 && freezesAvailable === 0) ? 0 : state.current;
}
