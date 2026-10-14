import { fromZonedTime } from "date-fns-tz";
import { toLocalDate } from "@/lib/stats/localDate";
import { shiftDate } from "@/lib/stats/dates";
import { characters } from "@/lib/characters/registry";
import type { StartSessionInput } from "@/lib/repo/types";

export type SeedPlan = StartSessionInput & { id: string; startedAt: string; endedAt: string };
export const SEED_ID_PREFIX = "ss-seed-v1-";

/** A timestamp plan, never precomputed actualSeconds or streak counters. */
export function generateSeedPlan(anchor: Date, timezone: string): SeedPlan[] {
  const today = toLocalDate(anchor, timezone);
  let seed = 1707;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const durations = [5, 15, 25, 50];
  const dates: string[] = [];
  for (let offset = -89; offset <= -11; offset++) {
    if (offset >= -28 && offset <= -17) continue;
    const include = random() >= 0.25;
    if (include || [-89, -29, -16, -11].includes(offset)) dates.push(shiftDate(today, offset));
  }
  const entries: { date: string; minutes: number }[] = [];
  // Reserve three hours for the final six consecutive days. Keep at least one
  // session on both sides of the twelve-day gap, then distribute extra work.
  let remaining = 2400 - 180;
  dates.forEach((date, index) => {
    const available = durations.filter((minutes) => minutes <= remaining - (dates.length - index - 1) * 5);
    const minutes = available[Math.floor(random() * available.length)];
    entries.push({ date, minutes }); remaining -= minutes;
  });
  let cursor = 0;
  while (remaining > 0) {
    const available = durations.filter((minutes) => minutes <= remaining);
    const minutes = available[Math.floor(random() * available.length)];
    entries.push({ date: dates[cursor++ % dates.length], minutes }); remaining -= minutes;
  }
  [25, 50, 15, 25, 50, 15].forEach((minutes, index) => entries.push({ date: shiftDate(today, index - 7), minutes }));
  entries.sort((a, b) => a.date.localeCompare(b.date));
  const perDay = new Map<string, number>();
  return entries.map(({ date, minutes }, index) => {
    const slot = perDay.get(date) ?? 0; perDay.set(date, slot + 1);
    const noon = fromZonedTime(`${date}T12:00:00`, timezone).getTime();
    const start = noon + slot * 70 * 60_000;
    return { id: `${SEED_ID_PREFIX}${today}-${index}`, startedAt: new Date(start).toISOString(),
      endedAt: new Date(start + minutes * 60_000).toISOString(), plannedMinutes: minutes,
      characterSlug: characters[index % characters.length].slug, task: null };
  });
}
