import { z } from "zod";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { DayStat } from "@/types/domain";
import type { StatsRange } from "@/types/stats";
import { shiftDate } from "./dates";

export const statsRangeSchema = z.object({ from: z.iso.date(), to: z.iso.date() }).strict().refine(value => value.from <= value.to);
export type ChartBucket = { from: string; to: string; totalSeconds: number; sessionCount: number };

export function chartBuckets(days: readonly DayStat[], range: StatsRange): ChartBucket[] {
  const { from, to } = statsRangeSchema.parse(range);
  const length = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  const width = Math.max(1, Math.ceil(length / 60));
  const buckets = Array.from({ length: Math.ceil(length / width) }, (_, index) => ({
    from: shiftDate(from, index * width), to: shiftDate(from, Math.min(length - 1, (index + 1) * width - 1)), totalSeconds: 0, sessionCount: 0,
  }));
  for (const day of days) {
    if (day.date < from || day.date > to) continue;
    const index = Math.floor(differenceInCalendarDays(parseISO(day.date), parseISO(from)) / width);
    buckets[index].totalSeconds += day.totalSeconds;
    buckets[index].sessionCount += day.sessionCount;
  }
  return buckets;
}
