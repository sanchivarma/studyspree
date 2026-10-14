import { z } from "zod";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import { aggregateSessions, summarizeSessions } from "@/lib/stats/aggregateSessions";
import { applyActivity, type StreakState } from "@/lib/streaks/computeStreak";
import type { DayStat, EndedReason, Profile, Session } from "@/types/domain";
import type { EndSessionResult, EndSessionStreak, Repository, SessionSummary, StartSessionInput } from "./types";

type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const iso = z.iso.datetime();
const date = z.iso.date();
const timezone = z.string().refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
});
const profileSchema = z.object({
  displayName: z.string(), selectedCharacter: z.string().min(1), timezone,
  showStreak: z.boolean(), reduceMotion: z.boolean(), webcamEnabled: z.boolean(), ambienceEnabled: z.boolean(),
}).strict();
const inputSchema = z.object({ plannedMinutes: z.number().finite().positive().nullable(), characterSlug: z.string().min(1), task: z.string().nullable() }).strict();
const sessionSchema = z.object({
  id: z.string().min(1), startedAt: iso, endedAt: iso.nullable(),
  ...inputSchema.shape, actualSeconds: z.number().int().min(0).max(21600),
  endedReason: z.enum(["completed", "stopped_early", "abandoned"]).nullable(), localDate: date,
}).strict().refine((session) => session.endedAt === null
  ? session.endedReason === null && session.actualSeconds === 0
  : session.endedReason !== null && session.endedAt >= session.startedAt);
const sessionsSchema = z.array(sessionSchema).refine((sessions) => new Set(sessions.map((session) => session.id)).size === sessions.length && sessions.filter((session) => session.endedAt === null).length <= 1);
const activeSchema = z.object({ id: z.string().min(1), lastHeartbeatAt: iso }).strict().nullable();
const streakSchema = z.object({
  current: z.number().int().nonnegative(), best: z.number().int().nonnegative(),
  lastActiveDate: date.nullable(), freezesRemaining: z.number().int().min(0).max(2), freezesResetAt: date,
}).strict().refine((state) => state.best >= state.current);
const streakEventSchema = z.object({ changed: z.boolean(), freezeUsed: z.boolean() }).strict();
const streakEventsSchema = z.record(z.string(), streakEventSchema);

function initialStreak(localDate: string): StreakState {
  return { current: 0, best: 0, lastActiveDate: null, freezesRemaining: 2,
    freezesResetAt: format(addMonths(startOfMonth(parseISO(localDate)), 1), "yyyy-MM-dd") };
}

export class LocalRepository implements Repository {
  private readonly memory = new Map<string, string>();
  private readonly memoryOverrides = new Set<string>();

  constructor(private readonly storageAccess: () => StorageAccess | null = () => typeof window === "undefined" ? null : window.localStorage) {}

  private write(key: string, value: unknown): void {
    const encoded = JSON.stringify(value);
    this.memory.set(key, encoded);
    try {
      const storage = this.storageAccess();
      if (!storage) { this.memoryOverrides.add(key); return; }
      storage.setItem(key, encoded);
      this.memoryOverrides.delete(key);
    } catch { this.memoryOverrides.add(key); }
  }

  private read<T>(key: string, schema: z.ZodType<T>, fallback: () => T): T {
    let raw = this.memory.get(key) ?? null;
    if (!this.memoryOverrides.has(key)) {
      try { const storage = this.storageAccess(); if (storage) raw = storage.getItem(key); } catch { /* Use the last readable value. */ }
    }
    // Reading an absent key must not overwrite a concurrent tab's first write.
    if (raw === null) return fallback();
    if (raw !== null) {
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) { this.memory.set(key, raw); return parsed.data; }
      } catch { /* Repair malformed JSON below. */ }
    }
    const value = fallback();
    this.write(key, value);
    return value;
  }

  // Web Locks serialize read/modify/write across tabs; mutations are synchronous
  // inside the callback, so double clicks are also safe without Web Locks.
  private mutate<T>(operation: () => T): Promise<T> {
    if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request("ss_repository", operation);
    try { return Promise.resolve(operation()); } catch (error) { return Promise.reject(error); }
  }

  private profile(): Profile {
    return this.read("ss_profile", profileSchema, () => ({
      displayName: "", selectedCharacter: "rain-desk", timezone: "UTC", showStreak: true,
      reduceMotion: false, webcamEnabled: false, ambienceEnabled: false,
    }));
  }
  private sessions(): Session[] { return this.read("ss_sessions", sessionsSchema, () => []); }
  private streak(sessions: Session[]): StreakState {
    return this.read("ss_streak", streakSchema, () => {
      // Upgrade older local data and recover a damaged streak key from history.
      // Replay each eligible calendar day once, in chronological order.
      const dates = [...new Set(sessions.filter((session) => session.endedAt !== null && session.endedReason !== "abandoned").map((session) => session.localDate))].sort();
      let state = initialStreak(dates[0] ?? toLocalDate(now(), this.profile().timezone));
      for (const localDate of dates) state = applyActivity(state, localDate).state;
      return state;
    });
  }
  private streakEvents(): Record<string, { changed: boolean; freezeUsed: boolean }> {
    // Event flags let duplicate Finish calls return the original activity event
    // without replaying it or spending another freeze. Time stays in ss_sessions.
    return this.read("ss_streak_events", streakEventsSchema, () => ({}));
  }
  private active(sessions: Session[]): Session | null {
    const pointer = this.read("ss_active", activeSchema, () => null);
    // Recover a start interrupted between writing the session and its pointer.
    return sessions.find((session) => session.id === pointer?.id && session.endedAt === null)
      ?? sessions.find((session) => session.endedAt === null) ?? null;
  }
  private totals(sessions: Session[], session: Session, streak: EndSessionStreak): EndSessionResult {
    return { session, totalSecondsAllTime: summarizeSessions(sessions).totalSeconds,
      dayTotalSeconds: aggregateSessions(sessions).find((day) => day.date === session.localDate)?.totalSeconds ?? 0, streak };
  }

  async getProfile(): Promise<Profile> { return this.profile(); }
  updateProfile(patch: Partial<Profile>): Promise<Profile> {
    return this.mutate(() => { const profile = profileSchema.parse({ ...this.profile(), ...patch }); this.write("ss_profile", profile); return profile; });
  }
  async getActiveSession(): Promise<Session | null> { return this.active(this.sessions()); }
  startSession(input: StartSessionInput): Promise<Session> {
    return this.mutate(() => {
      const sessions = this.sessions();
      const active = this.active(sessions);
      if (active) return active;
      const validated = inputSchema.parse(input);
      const startedAt = now().toISOString();
      const session: Session = { ...validated, id: crypto.randomUUID(), startedAt, endedAt: null, actualSeconds: 0,
        endedReason: null, localDate: toLocalDate(new Date(startedAt), this.profile().timezone) };
      this.write("ss_sessions", [...sessions, session]);
      this.write("ss_active", { id: session.id, lastHeartbeatAt: startedAt });
      return session;
    });
  }
  endSession(id: string, reason: EndedReason): Promise<EndSessionResult> {
    return this.mutate(() => {
      z.enum(["completed", "stopped_early", "abandoned"]).parse(reason);
      const sessions = this.sessions();
      const session = sessions.find((value) => value.id === id);
      if (!session) throw new Error("Session not found");
      const previousStreak = this.streak(sessions);
      if (session.endedAt !== null) {
        const event = session.endedReason === "abandoned" ? undefined : this.streakEvents()[id];
        return this.totals(sessions, session, { current: previousStreak.current, best: previousStreak.best,
          changed: event?.changed ?? false, freezeUsed: event?.freezeUsed ?? false });
      }
      const startedMs = new Date(session.startedAt).getTime();
      // Moving the development clock backwards must never produce negative time.
      const endedMs = Math.max(startedMs, now().getTime());
      const ended: Session = { ...session, endedAt: new Date(endedMs).toISOString(), endedReason: reason,
        actualSeconds: Math.min(Math.floor((endedMs - startedMs) / 1000), 21600) };
      const updated = sessions.map((value) => value.id === id ? ended : value);
      const activity = reason === "abandoned" ? { state: previousStreak, changed: false, freezeUsed: false }
        : applyActivity(previousStreak, ended.localDate);
      this.write("ss_sessions", updated);
      if (reason !== "abandoned") {
        this.write("ss_streak", activity.state);
        this.write("ss_streak_events", { ...this.streakEvents(), [id]: { changed: activity.changed, freezeUsed: activity.freezeUsed } });
      }
      this.write("ss_active", null);
      return this.totals(updated, ended, { current: activity.state.current, best: activity.state.best, changed: activity.changed, freezeUsed: activity.freezeUsed });
    });
  }
  heartbeat(id: string): Promise<void> {
    return this.mutate(() => {
      const active = this.active(this.sessions());
      if (active?.id === id) this.write("ss_active", { id, lastHeartbeatAt: now().toISOString() });
    });
  }
  async getSessions(opts: { limit: number; offset: number }): Promise<Session[]> {
    const { limit, offset } = z.object({ limit: z.number().int().nonnegative(), offset: z.number().int().nonnegative() }).strict().parse(opts);
    return this.sessions().sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id)).slice(offset, offset + limit);
  }
  async getDayStats(from: string, to: string): Promise<DayStat[]> {
    date.parse(from); date.parse(to);
    if (from > to) throw new Error("Invalid date range");
    return aggregateSessions(this.sessions()).filter((day) => day.date >= from && day.date <= to);
  }
  async getTotalSecondsAllTime(): Promise<number> {
    return summarizeSessions(this.sessions()).totalSeconds;
  }
  async getStreak(): Promise<StreakState> { return this.streak(this.sessions()); }
  async getSessionSummary(): Promise<SessionSummary> { return summarizeSessions(this.sessions()); }
}
