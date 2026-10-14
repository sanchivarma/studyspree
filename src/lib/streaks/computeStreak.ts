import { addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from "date-fns";

export type StreakState = {
  current: number;
  best: number;
  lastActiveDate: string | null;
  freezesRemaining: number;
  freezesResetAt: string;
};

export type ActivityResult = { state: StreakState; changed: boolean; freezeUsed: boolean };

/** Apply a valid YYYY-MM-DD date already bucketed in the user's timezone.
 * `changed` records new activity; monthly freeze maintenance happens first,
 * even for a duplicate date. Always persist the returned state.
 */
export function applyActivity(state: StreakState, localDate: string): ActivityResult {
  const next = { ...state };
  const activityDate = parseISO(localDate);
  if (localDate >= next.freezesResetAt) {
    next.freezesRemaining = 2;
    next.freezesResetAt = format(addMonths(startOfMonth(activityDate), 1), "yyyy-MM-dd");
  }

  if (next.lastActiveDate === localDate) {
    return { state: next, changed: false, freezeUsed: false };
  }

  const gap = next.lastActiveDate === null ? null : differenceInCalendarDays(activityDate, parseISO(next.lastActiveDate));
  let freezeUsed = false;
  if (gap === 1) {
    next.current += 1;
  } else if (gap === 2 && next.freezesRemaining > 0) {
    next.freezesRemaining -= 1;
    next.current += 1;
    freezeUsed = true;
  } else {
    next.current = 1;
  }

  next.best = Math.max(next.best, next.current);
  next.lastActiveDate = localDate;
  return { state: next, changed: true, freezeUsed };
}
