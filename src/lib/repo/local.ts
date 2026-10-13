import { z } from "zod";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import type { DayStat, Profile, Session } from "@/types/domain";
import type { EndSessionResult, Repository, StartSessionInput } from "./types";

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
  private active(sessions: Session[]): Session | null {
    const pointer = this.read("ss_active", activeSchema, () => null);
    // Recover a start interrupted between writing the session and its pointer.
    return sessions.find((session) => session.id === pointer?.id && session.endedAt === null)
      ?? sessions.find((session) => session.endedAt === null) ?? null;
  }
  private totals(sessions: Session[], session: Session): EndSessionResult {
    const ended = sessions.filter((value) => value.endedAt !== null);
    return { session, totalSecondsAllTime: ended.reduce((sum, value) => sum + value.actualSeconds, 0),
      dayTotalSeconds: ended.filter((value) => value.localDate === session.localDate).reduce((sum, value) => sum + value.actualSeconds, 0) };
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
        endedReason: null, localDate: toLocalDate(startedAt, this.profile().timezone) };
      this.write("ss_sessions", [...sessions, session]);
      this.write("ss_active", { id: session.id, lastHeartbeatAt: startedAt });
      return session;
    });
  }
  endSession(id: string, reason: "completed" | "stopped_early"): Promise<EndSessionResult> {
    return this.mutate(() => {
      z.enum(["completed", "stopped_early"]).parse(reason);
      const sessions = this.sessions();
      const session = sessions.find((value) => value.id === id);
      if (!session) throw new Error("Session not found");
      if (session.endedAt !== null) return this.totals(sessions, session);
      const startedMs = new Date(session.startedAt).getTime();
      // Moving the development clock backwards must never produce negative time.
      const endedMs = Math.max(startedMs, now().getTime());
      const ended: Session = { ...session, endedAt: new Date(endedMs).toISOString(), endedReason: reason,
        actualSeconds: Math.min(Math.floor((endedMs - startedMs) / 1000), 21600) };
      const updated = sessions.map((value) => value.id === id ? ended : value);
      this.write("ss_sessions", updated);
      this.write("ss_active", null);
      return this.totals(updated, ended);
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
    const days = new Map<string, DayStat>();
    for (const session of this.sessions()) {
      if (session.endedAt === null || session.localDate < from || session.localDate > to) continue;
      const day = days.get(session.localDate) ?? { date: session.localDate, totalSeconds: 0, sessionCount: 0 };
      day.totalSeconds += session.actualSeconds; day.sessionCount += 1;
      days.set(day.date, day);
    }
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  async getTotalSecondsAllTime(): Promise<number> {
    return this.sessions().reduce((sum, session) => sum + (session.endedAt === null ? 0 : session.actualSeconds), 0);
  }
}
