import { describe, expect, it } from "vitest";
import { chartBuckets, statsRangeSchema } from "./ranges";
import { paginateHistory } from "./history";
import type { Session } from "@/types/domain";

const session = (id: string, localDate = "2026-10-14"): Session => ({
  id, localDate, startedAt: "2026-10-13T23:00:00.000Z", endedAt: "2026-10-13T23:01:00.000Z", actualSeconds: 60,
  plannedMinutes: 5, endedReason: "stopped_early", themeSlug: "rain-desk", task: null, companions: { mode: "solo", characterSlugs: [] },
});

describe("filtered session history", () => {
  it("uses saved local dates and excludes unfinished sessions", () => {
    const pending = { ...session("pending"), endedAt: null, endedReason: null, actualSeconds: 0 };
    const result = paginateHistory([session("a"), session("b", "2026-10-13"), pending], { from: "2026-10-14", to: "2026-10-14", limit: 20 });
    expect(result.items.map(value => value.id)).toEqual(["a"]);
  });
  it("paginates timestamp ties deterministically without mutating the input", () => {
    const values = [session("a"), session("c"), session("b")];
    const first = paginateHistory(values, { limit: 2 });
    expect(first.items.map(value => value.id)).toEqual(["c", "b"]);
    const second = paginateHistory(values, { limit: 2, cursor: first.nextCursor! });
    expect(second.items.map(value => value.id)).toEqual(["a"]);
    expect(second.nextCursor).toBeNull();
    expect(values.map(value => value.id)).toEqual(["a", "c", "b"]);
    expect(() => paginateHistory(values, { limit: 2, cursor: first.nextCursor!, from: "2026-10-01" })).toThrow();
    expect(() => paginateHistory(values, { limit: 2, cursor: "%invalid" })).toThrow();
  });
  it("filters companion snapshots and rejects invalid dates/limits", () => {
    const character = { ...session("character"), companions: { mode: "characters" as const, characterSlugs: ["female-04" as const] } };
    expect(paginateHistory([session("solo"), character], { companionMode: "characters", limit: 20 }).items).toEqual([character]);
    expect(() => paginateHistory([], { from: "2026-03-02", to: "2026-03-01", limit: 20 })).toThrow();
    expect(() => paginateHistory([], { limit: 101 })).toThrow();
  });
});

describe("date-range charts", () => {
  it.each(["2026-03-07", "2026-10-24"])("preserves exact day totals across DST around %s", from => {
    const range = { from, to: from === "2026-03-07" ? "2026-03-10" : "2026-10-27" };
    const result = chartBuckets([{ date: from, totalSeconds: 120, sessionCount: 2 }], range);
    expect(result).toHaveLength(4);
    expect(result[0].totalSeconds).toBe(120);
    expect(result.slice(1).every(day => day.totalSeconds === 0)).toBe(true);
  });
  it("bounds chart elements for long histories while conserving totals", () => {
    const buckets = chartBuckets([{ date: "2026-10-15", totalSeconds: 300, sessionCount: 1 }], { from: "2000-01-01", to: "2026-10-15" });
    expect(buckets.length).toBeLessThanOrEqual(60);
    expect(buckets.reduce((sum, bucket) => sum + bucket.totalSeconds, 0)).toBe(300);
    expect(buckets.at(-1)?.to).toBe("2026-10-15");
    expect(statsRangeSchema.safeParse({ from: "2026-02-30", to: "2026-03-01" }).success).toBe(false);
  });
});
