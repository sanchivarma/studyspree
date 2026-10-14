import { differenceInCalendarDays, parseISO } from "date-fns";
import { shiftDate } from "./dates";
import type { DayStat } from "@/types/domain";

export function fillDays(days: readonly DayStat[], from: string, to: string): DayStat[] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const count = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const date = shiftDate(from, index);
    return byDate.get(date) ?? { date, totalSeconds: 0, sessionCount: 0 };
  });
}
