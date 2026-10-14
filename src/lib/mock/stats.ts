import { themes, type ThemeSlug } from "@/lib/themes/registry";
import { shiftDate } from "@/lib/stats/dates";

export type DayStat = { date: string; totalSeconds: number; sessionCount: number };
export type MockSession = { id: string; date: string; totalSeconds: number; theme: ThemeSlug };
export type StatsSummary = { totalSeconds: number; sessionCount: number; currentStreak: number; bestStreak: number; freezesLeft: number };

// A fixed calendar anchor keeps the mock page identical across reloads and machines.
export const MOCK_REFERENCE_DATE = "2026-10-13";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function generateMockStats(seed = 1707): DayStat[] {
  const random = seededRandom(seed);
  const zeros = new Set(Array.from({ length: 9 }, (_, index) => 160 + index));
  zeros.add(360);
  const protectedDays = new Set([159, 169, 361, 362, 363, 364]);
  const candidates = Array.from({ length: 365 }, (_, index) => index).filter((index) => !zeros.has(index) && !protectedDays.has(index));
  for (let index = candidates.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  for (const index of candidates.slice(0, 91 - zeros.size)) zeros.add(index);

  return Array.from({ length: 365 }, (_, index) => {
    const recent = Math.max(0, index - 309) / 55;
    const minutes = recent > 0 ? Math.round(25 + recent * 130 + random() * 12) : Math.round(14 + random() * 50);
    const totalSeconds = zeros.has(index) ? 0 : minutes * 60;
    return { date: shiftDate(MOCK_REFERENCE_DATE, index - 364), totalSeconds, sessionCount: totalSeconds === 0 ? 0 : Math.max(1, Math.ceil(minutes / 50)) };
  });
}

export function summarizeStats(days: readonly DayStat[]): StatsSummary {
  let run = 0;
  let bestStreak = 0;
  let totalSeconds = 0;
  let sessionCount = 0;
  let previousDate: string | undefined;
  for (const day of days) {
    totalSeconds += day.totalSeconds;
    sessionCount += day.sessionCount;
    run = day.totalSeconds > 0 ? previousDate === shiftDate(day.date, -1) ? run + 1 : 1 : 0;
    previousDate = day.date;
    bestStreak = Math.max(bestStreak, run);
  }
  return { totalSeconds, sessionCount, currentStreak: run, bestStreak, freezesLeft: 2 };
}

export const mockDayStats = generateMockStats();
export const mockStatsSummary = summarizeStats(mockDayStats);
export const mockSessions: MockSession[] = [];
for (const day of [...mockDayStats].reverse()) {
  for (let index = day.sessionCount - 1; index >= 0 && mockSessions.length < 20; index--) {
    const base = Math.floor(day.totalSeconds / day.sessionCount);
    mockSessions.push({
      id: `mock-${day.date}-${index}`,
      date: day.date,
      totalSeconds: base + (index === 0 ? day.totalSeconds % day.sessionCount : 0),
      theme: themes[mockSessions.length % themes.length].slug,
    });
  }
  if (mockSessions.length === 20) break;
}
