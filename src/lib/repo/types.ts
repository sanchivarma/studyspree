import type { DayStat, EndedReason, Profile, Session } from "@/types/domain";
import type { StreakState } from "@/lib/streaks/computeStreak";
import type { CompanionPreferences } from "@/types/characters";
import type { DashboardData } from "@/types/dashboard";
import type { SessionHistoryQuery, SessionHistoryPage } from "@/types/stats";
import type { OwnProfile, ProfileEdit } from "@/lib/profiles/schemas";

export type StartSessionInput = { plannedMinutes: number | null; themeSlug: string; task: string | null; companions?: CompanionPreferences };
export type SessionSummary = { totalSeconds: number; sessionCount: number; firstSessionDate: string | null };
export type EndSessionStreak = Pick<StreakState, "current" | "best"> & { changed: boolean; freezeUsed: boolean };
export type EndSessionResult = { session: Session; totalSecondsAllTime: number; dayTotalSeconds: number; streak: EndSessionStreak };

export interface Repository {
  getDirectoryProfile(): Promise<OwnProfile>;
  updateDirectoryProfile(input: ProfileEdit): Promise<OwnProfile>;
  getDashboard(): Promise<DashboardData>;
  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Profile>): Promise<Profile>;
  getActiveSession(): Promise<Session | null>;
  startSession(input: StartSessionInput): Promise<Session>;
  endSession(id: string, reason: EndedReason): Promise<EndSessionResult>;
  heartbeat(id: string): Promise<void>;
  updateSessionCompanions(id: string, companions: CompanionPreferences): Promise<Session>;
  getSessions(opts: { limit: number; offset: number }): Promise<Session[]>;
  getSessionHistory(query: SessionHistoryQuery): Promise<SessionHistoryPage>;
  getDayStats(from: string, to: string): Promise<DayStat[]>;
  getTotalSecondsAllTime(): Promise<number>;
  getStreak(): Promise<StreakState>;
  getSessionSummary(): Promise<SessionSummary>;
  seedDemoSessions(): Promise<SessionSummary>;
}
