import { expect, it, vi } from "vitest";
import { generateSeedPlan } from "./seedPlan";
import { toLocalDate } from "@/lib/stats/localDate";
import { shiftDate } from "@/lib/stats/dates";

it.each(["UTC", "Europe/Berlin", "America/Los_Angeles", "Pacific/Kiritimati"])("builds a deterministic 40-hour timestamp plan in %s", (timezone) => {
  const anchor = new Date("2026-10-14T00:05:00Z");
  const random = vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("Unseeded randomness"); });
  try {
    const plan = generateSeedPlan(anchor, timezone);
    expect(generateSeedPlan(anchor, timezone)).toEqual(plan);
    expect(plan.reduce((sum, session) => sum + (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000, 0)).toBe(144000);
    expect(new Set(plan.map((session) => session.characterSlug)).size).toBe(4);
    expect([...new Set(plan.map((session) => session.plannedMinutes))].sort((a, b) => a! - b!)).toEqual([5, 15, 25, 50]);
    const today = toLocalDate(anchor, timezone);
    const dates = new Set(plan.map((session) => toLocalDate(new Date(session.startedAt), timezone)));
    for (let offset = -28; offset <= -17; offset++) expect(dates.has(shiftDate(today, offset))).toBe(false);
    for (const offset of [-89, -29, -16, -11, -7, -6, -5, -4, -3, -2]) expect(dates.has(shiftDate(today, offset))).toBe(true);
    for (const offset of [-10, -9, -8, -1, 0]) expect(dates.has(shiftDate(today, offset))).toBe(false);
    for (const session of plan) {
      expect(toLocalDate(new Date(session.startedAt), timezone)).toBe(toLocalDate(new Date(session.endedAt), timezone));
      expect(session).not.toHaveProperty("actualSeconds");
    }
  } finally { random.mockRestore(); }
});
