import { afterEach, describe, expect, it, vi } from "vitest";
import { generateMockStats, mockDayStats, mockSessions, mockStatsSummary, summarizeStats, MOCK_REFERENCE_DATE } from "./stats";
import { shiftDate } from "@/lib/stats/dates";
import { characters } from "@/lib/characters/registry";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("deterministic stats fixtures", () => {
  it("generates the same contiguous 365-day year regardless of the wall clock", () => {
    vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("Unseeded randomness"); });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const first = generateMockStats();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    expect(generateMockStats()).toEqual(first);
    expect(generateMockStats(42)).not.toEqual(first);
    expect(first).toHaveLength(365);
    expect(first.at(-1)?.date).toBe(MOCK_REFERENCE_DATE);
    first.forEach((day, index) => {
      expect(day.date).toBe(shiftDate(first[0].date, index));
      expect(Number.isInteger(day.totalSeconds)).toBe(true);
      expect(day.totalSeconds).toBeGreaterThanOrEqual(0);
      expect(day.sessionCount === 0).toBe(day.totalSeconds === 0);
    });
  });
  it("contains about 25% neutral days and an exact nine-day gap", () => {
    expect(mockDayStats.filter((day) => day.totalSeconds === 0)).toHaveLength(91);
    expect(mockDayStats.slice(160, 169).every((day) => day.totalSeconds === 0)).toBe(true);
    expect(mockDayStats[159].totalSeconds).toBeGreaterThan(0);
    expect(mockDayStats[169].totalSeconds).toBeGreaterThan(0);
  });
  it("ramps up recent active days and ends with a four-day streak", () => {
    const average = (start: number, end: number) => {
      const active = mockDayStats.slice(start, end).filter((day) => day.totalSeconds > 0);
      return active.reduce((sum, day) => sum + day.totalSeconds, 0) / active.length;
    };
    expect(average(337, 365)).toBeGreaterThan(average(309, 337) * 1.5);
    expect(mockStatsSummary.currentStreak).toBe(4);
    expect(mockStatsSummary.bestStreak).toBeGreaterThanOrEqual(4);
    expect(mockStatsSummary.totalSeconds).toBe(mockDayStats.reduce((sum, day) => sum + day.totalSeconds, 0));
    expect(mockStatsSummary.sessionCount).toBe(mockDayStats.reduce((sum, day) => sum + day.sessionCount, 0));
  });
  it("exports twenty recent sessions consistent with the daily totals", () => {
    expect(mockSessions).toHaveLength(20);
    expect(new Set(mockSessions.map((session) => session.id)).size).toBe(20);
    mockSessions.forEach((session, index) => {
      expect(session.totalSeconds).toBeGreaterThan(0);
      expect(characters.some((character) => character.slug === session.character)).toBe(true);
      if (index > 0) expect(session.date <= mockSessions[index - 1].date).toBe(true);
    });
    for (const date of new Set(mockSessions.map((session) => session.date))) {
      const sessions = mockSessions.filter((session) => session.date === date);
      const day = mockDayStats.find((value) => value.date === date)!;
      expect(sessions.length).toBeLessThanOrEqual(day.sessionCount);
      expect(sessions.reduce((sum, session) => sum + session.totalSeconds, 0)).toBeLessThanOrEqual(day.totalSeconds);
    }
  });
  it("handles empty data, zero days and missing calendar dates in streak totals", () => {
    expect(summarizeStats([])).toMatchObject({ totalSeconds: 0, sessionCount: 0, currentStreak: 0, bestStreak: 0 });
    const days = [1, 2, 4, 5, 6].map((day) => ({ date: `2026-01-0${day}`, totalSeconds: day === 6 ? 0 : 1500, sessionCount: day === 6 ? 0 : 1 }));
    expect(summarizeStats(days)).toMatchObject({ currentStreak: 0, bestStreak: 2, sessionCount: 4, totalSeconds: 6000 });
  });
});
