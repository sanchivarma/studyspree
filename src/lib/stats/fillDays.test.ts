import { expect, it } from "vitest";
import { fillDays } from "./fillDays";

it("fills gaps with neutral zero data without changing existing totals", () => {
  const day = Object.freeze({ date: "2026-10-12", totalSeconds: 600, sessionCount: 1 });
  const result = fillDays(Object.freeze([day]), "2026-10-11", "2026-10-13");
  expect(result).toEqual([
    { date: "2026-10-11", totalSeconds: 0, sessionCount: 0 }, day,
    { date: "2026-10-13", totalSeconds: 0, sessionCount: 0 },
  ]);
  expect(result.reduce((sum, value) => sum + value.totalSeconds, 0)).toBe(600);
});
it("handles leap/year boundaries and reversed ranges", () => {
  expect(fillDays([], "2028-02-28", "2028-03-01").map((day) => day.date)).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  expect(fillDays([], "2026-12-31", "2027-01-01").map((day) => day.date)).toEqual(["2026-12-31", "2027-01-01"]);
  expect(fillDays([], "2026-10-13", "2026-10-12")).toEqual([]);
});
