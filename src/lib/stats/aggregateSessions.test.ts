import { expect, it } from "vitest";
import { aggregateSessions, summarizeSessions } from "./aggregateSessions";
import type { Session } from "@/types/domain";

function session(id: string, localDate: string, actualSeconds: number, endedReason: Session["endedReason"] = "completed"): Session {
  return { id, localDate, actualSeconds, endedReason, startedAt: "2026-10-13T00:00:00Z",
    endedAt: endedReason === null ? null : "2026-10-13T01:00:00Z", plannedMinutes: 25, themeSlug: "rain-desk", task: null, companions: { mode: "solo", characterSlugs: [] } };
}

it("returns empty aggregates and a nullable first date for empty or active history", () => {
  for (const sessions of [[], [session("active", "2026-10-13", 0, null)]]) {
    expect(aggregateSessions(sessions)).toEqual([]);
    expect(summarizeSessions(sessions)).toEqual({ totalSeconds: 0, sessionCount: 0, firstSessionDate: null });
  }
});
it("groups by saved localDate, sorts chronologically, and leaves calendar gaps to the UI", () => {
  const sessions = [session("a", "2026-10-15", 60), session("b", "2026-10-12", 120), session("c", "2026-10-15", 180), session("active", "2026-10-14", 0, null)];
  expect(aggregateSessions(sessions)).toEqual([
    { date: "2026-10-12", totalSeconds: 120, sessionCount: 1 },
    { date: "2026-10-15", totalSeconds: 240, sessionCount: 2 },
  ]);
  expect(summarizeSessions(sessions)).toEqual({ totalSeconds: 360, sessionCount: 3, firstSessionDate: "2026-10-12" });
});
it("includes all banked reasons and zero-second ended sessions, without mutating input", () => {
  const sessions = Object.freeze([
    Object.freeze(session("complete", "2026-10-13", 60)),
    Object.freeze(session("early", "2026-10-13", 10, "stopped_early")),
    Object.freeze(session("abandoned", "2026-10-13", 20, "abandoned")),
    Object.freeze(session("zero", "2026-10-14", 0)),
  ]);
  expect(aggregateSessions(sessions)).toEqual([
    { date: "2026-10-13", totalSeconds: 90, sessionCount: 3 },
    { date: "2026-10-14", totalSeconds: 0, sessionCount: 1 },
  ]);
  expect(summarizeSessions(sessions)).toEqual({ totalSeconds: 90, sessionCount: 4, firstSessionDate: "2026-10-13" });
  expect(aggregateSessions(sessions).reduce((sum, day) => sum + day.totalSeconds, 0)).toBe(summarizeSessions(sessions).totalSeconds);
});
