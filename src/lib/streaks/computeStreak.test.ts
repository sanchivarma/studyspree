import { addDays, format, parseISO } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { applyActivity, type StreakState } from "./computeStreak";
import fixtures from "./fixtures.json";

describe("applyActivity shared contract fixtures", () => {
  // Keep these plain JSON cases available to the future SQL contract suite.
  it.each(fixtures)("$name", ({ state, localDate, expected }) => {
    const input = Object.freeze({ ...state });
    const result = applyActivity(input, localDate);
    expect(result).toEqual(expected);
    expect(result.state.best).toBeGreaterThanOrEqual(state.best);
    expect(input).toEqual(state);
    expect(applyActivity(result.state, localDate)).toEqual({ state: result.state, changed: false, freezeUsed: false });
  });
});

describe("streak invariants", () => {
  it("never reduces best and is idempotent across streaks, balances, gaps and refill states", () => {
    for (const current of [0, 1, 7, 40]) {
      for (const historicBest of [0, 100]) {
        for (const freezesRemaining of [0, 1, 2]) {
          for (const gap of [-1, 0, 1, 2, 3, 30, 365]) {
            for (const refillDue of [false, true]) {
              const state: StreakState = {
                current, best: Math.max(current, historicBest), lastActiveDate: "2026-10-10",
                freezesRemaining, freezesResetAt: refillDue ? "1900-01-01" : "2100-01-01",
              };
              const localDate = format(addDays(parseISO(state.lastActiveDate!), gap), "yyyy-MM-dd");
              const result = applyActivity(Object.freeze(state), localDate);
              expect(result.state.best).toBeGreaterThanOrEqual(state.best);
              expect(result.state.freezesRemaining).toBeGreaterThanOrEqual(0);
              expect(result.state.freezesRemaining).toBeLessThanOrEqual(2);
              expect(applyActivity(result.state, localDate)).toEqual({ state: result.state, changed: false, freezeUsed: false });
            }
          }
        }
      }
    }
  });

  it("spends each freeze once, preserves best after a lapse, and refills next month", () => {
    let state: StreakState = { current: 0, best: 0, lastActiveDate: null, freezesRemaining: 2, freezesResetAt: "2026-11-01" };
    const expected = [
      { date: "2026-10-01", current: 1, best: 1, balance: 2, used: false },
      { date: "2026-10-03", current: 2, best: 2, balance: 1, used: true },
      { date: "2026-10-05", current: 3, best: 3, balance: 0, used: true },
      { date: "2026-10-07", current: 1, best: 3, balance: 0, used: false },
      { date: "2026-11-01", current: 1, best: 3, balance: 2, used: false },
    ];
    for (const entry of expected) {
      const result = applyActivity(state, entry.date);
      expect(result).toEqual({
        state: { current: entry.current, best: entry.best, lastActiveDate: entry.date,
          freezesRemaining: entry.balance, freezesResetAt: entry.date < "2026-11-01" ? "2026-11-01" : "2026-12-01" },
        changed: true, freezeUsed: entry.used,
      });
      state = result.state;
      expect(applyActivity(state, entry.date)).toEqual({ state, changed: false, freezeUsed: false });
    }
  });

  it("is deterministic regardless of the current clock", () => {
    const fixture = fixtures[2];
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("1990-01-01T00:00:00Z"));
      const earlier = applyActivity(fixture.state, fixture.localDate);
      vi.setSystemTime(new Date("2100-12-31T23:59:59Z"));
      expect(applyActivity(fixture.state, fixture.localDate)).toEqual(earlier);
    } finally {
      vi.useRealTimers();
    }
  });
});
