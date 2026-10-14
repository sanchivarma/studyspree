import type { DayStat, Session } from "@/types/domain";
import type { SessionSummary } from "@/lib/repo/types";

/** localDate was captured using the profile timezone at session start.
 * Keep that historical bucket even if the profile timezone later changes.
 */
export function aggregateSessions(sessions: readonly Session[]): DayStat[] {
  const days = new Map<string, DayStat>();
  for (const session of sessions) {
    if (session.endedAt === null) continue;
    const day = days.get(session.localDate) ?? { date: session.localDate, totalSeconds: 0, sessionCount: 0 };
    day.totalSeconds += session.actualSeconds;
    day.sessionCount += 1;
    days.set(day.date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeSessions(sessions: readonly Session[]): SessionSummary {
  let totalSeconds = 0;
  let sessionCount = 0;
  let firstSessionDate: string | null = null;
  for (const session of sessions) {
    if (session.endedAt === null) continue;
    totalSeconds += session.actualSeconds;
    sessionCount += 1;
    if (firstSessionDate === null || session.localDate < firstSessionDate) firstSessionDate = session.localDate;
  }
  return { totalSeconds, sessionCount, firstSessionDate };
}
