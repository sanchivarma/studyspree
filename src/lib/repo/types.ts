import type { DayStat, Profile, Session } from "@/types/domain";

export type StartSessionInput = { plannedMinutes: number | null; characterSlug: string; task: string | null };
export type EndSessionResult = { session: Session; totalSecondsAllTime: number; dayTotalSeconds: number };

export interface Repository {
  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Profile>): Promise<Profile>;
  getActiveSession(): Promise<Session | null>;
  startSession(input: StartSessionInput): Promise<Session>;
  endSession(id: string, reason: "completed" | "stopped_early"): Promise<EndSessionResult>;
  heartbeat(id: string): Promise<void>;
  getSessions(opts: { limit: number; offset: number }): Promise<Session[]>;
  getDayStats(from: string, to: string): Promise<DayStat[]>;
  getTotalSecondsAllTime(): Promise<number>;
}
