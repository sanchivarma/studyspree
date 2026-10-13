import { expect, it } from "vitest";
import { computeCurrentStreak } from "./computeCurrentStreak";
import type { DayStat } from "@/types/domain";

it("counts consecutive active dates through today or yesterday", () => {
  const days: DayStat[] = [10, 11, 12, 13].map((day) => ({ date: `2026-10-${day}`, totalSeconds: 60, sessionCount: 1 }));
  expect(computeCurrentStreak(days, "2026-10-13")).toBe(4);
  expect(computeCurrentStreak(days, "2026-10-14")).toBe(4);
  expect(computeCurrentStreak(days, "2026-10-15")).toBe(0);
  expect(computeCurrentStreak([], "2026-10-13")).toBe(0);
});
it("ignores zero days and future dates and handles month boundaries", () => {
  const days = [
    { date: "2026-09-30", totalSeconds: 30, sessionCount: 1 },
    { date: "2026-10-01", totalSeconds: 10, sessionCount: 1 },
    { date: "2026-10-02", totalSeconds: 0, sessionCount: 1 },
    { date: "2026-10-03", totalSeconds: 10, sessionCount: 1 },
  ];
  expect(computeCurrentStreak(days, "2026-10-01")).toBe(2);
  expect(computeCurrentStreak(days, "2026-10-03")).toBe(1);
});
