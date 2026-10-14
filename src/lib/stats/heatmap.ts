import type { DayStat } from "@/types/domain";
import { dayOfWeek, shiftDate } from "./dates";

export function getIntensity(seconds: number): 0 | 1 | 2 | 3 | 4 {
  if (seconds <= 0) return 0;
  if (seconds < 30 * 60) return 1;
  if (seconds < 60 * 60) return 2;
  if (seconds < 120 * 60) return 3;
  return 4;
}

export function buildHeatmap(days: readonly DayStat[], referenceDate: string) {
  const first = shiftDate(referenceDate, -364);
  const start = shiftDate(first, -dayOfWeek(first));
  const byDate = new Map(days.map((day) => [day.date, day]));
  return Array.from({ length: 53 * 7 }, (_, index) => {
    const date = shiftDate(start, index);
    const day = byDate.get(date);
    return { date, totalSeconds: day?.totalSeconds ?? 0, isFuture: date > referenceDate, isPadding: !day && date < first };
  });
}
