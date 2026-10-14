import { expect, it } from "vitest";
import { currentStreak } from "./currentStreak";
import type { StreakState } from "./computeStreak";

const state: StreakState = { current: 6, best: 20, lastActiveDate: "2026-10-12", freezesRemaining: 1, freezesResetAt: "2026-11-01" };
it.each([["2026-10-12", 6], ["2026-10-13", 6], ["2026-10-14", 6], ["2026-10-15", 0], ["2026-10-11", 6]])("projects current for %s without mutating the stored best", (today, expected) => {
  expect(currentStreak(Object.freeze(state), today)).toBe(expected);
  expect(state.best).toBe(20);
});
it("requires a freeze for a two-day gap and uses a renewed month's available balance", () => {
  expect(currentStreak({ ...state, freezesRemaining: 0 }, "2026-10-14")).toBe(0);
  expect(currentStreak({ ...state, lastActiveDate: "2026-10-30", freezesRemaining: 0 }, "2026-11-01")).toBe(6);
  expect(currentStreak({ ...state, lastActiveDate: null }, "2026-10-14")).toBe(0);
});
