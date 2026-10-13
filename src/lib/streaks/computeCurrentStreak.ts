import type { DayStat } from "@/types/domain";
import { shiftDate } from "@/lib/stats/dates";

export function computeCurrentStreak(days: readonly DayStat[], today: string): number {
  const active = new Set(days.filter((day) => day.totalSeconds > 0).map((day) => day.date));
  let date = active.has(today) ? today : shiftDate(today, -1);
  let count = 0;
  while (active.has(date)) { count += 1; date = shiftDate(date, -1); }
  return count;
}
