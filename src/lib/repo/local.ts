import { z } from "zod";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { now } from "@/lib/clock";
import { musicTracks } from "@/lib/audio/catalog";
import { toLocalDate } from "@/lib/stats/localDate";
import { defaultTimezone } from "@/lib/stats/defaultTimezone";
import { aggregateSessions, summarizeSessions } from "@/lib/stats/aggregateSessions";
import { applyActivity, type StreakState } from "@/lib/streaks/computeStreak";
import type { DayStat, EndedReason, Profile, Session } from "@/types/domain";
import type { EndSessionResult, EndSessionStreak, Repository, SessionSummary, StartSessionInput } from "./types";
import { upgradeThemeNames } from "./upgradeThemes";
import { companionSchema, localCompanionSchema, soloCompanions } from "@/lib/characters/schemas";
import type { CompanionPreferences } from "@/types/characters";
import type { DashboardData } from "@/types/dashboard";
import { paginateHistory } from "@/lib/stats/history";
import type { SessionHistoryQuery, SessionHistoryPage } from "@/types/stats";
import { profileEditSchema, type ProfileEdit, type OwnProfile } from "@/lib/profiles/schemas";

type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const iso = z.iso.datetime();
const date = z.iso.date();
const timezone = z.string().refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
});
const profileSchema = z.object({
  displayName: z.string(), selectedTheme: z.string().min(1), timezone,
  showStreak: z.boolean(), reduceMotion: z.boolean(), webcamEnabled: z.boolean(), ambienceEnabled: z.boolean(),
  // Older profiles upgrade without discarding preferences.
  comebackShownForDate: date.nullable().default(null),
  webcamCorner: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("bottom-right"),
  musicTrack: z.enum(musicTracks.map(track => track.slug)).nullable().default(null),
  musicVolume: z.number().min(0).max(1).default(0),
  roomVolume: z.number().min(0).max(1).default(0),
  companionPreferences: localCompanionSchema.default(soloCompanions),
}).strict();
const inputSchema = z.object({ plannedMinutes: z.number().finite().positive().nullable(), themeSlug: z.string().min(1), task: z.string().nullable(), companions: localCompanionSchema.default(soloCompanions) }).strict();
const sessionSchema = z.object({
  id: z.string().min(1), startedAt: iso, endedAt: iso.nullable(),
  ...inputSchema.shape, companions: companionSchema.default(soloCompanions), actualSeconds: z.number().int().min(0).max(21600),
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
const seedSchema = z.object({ version: z.literal(1), anchorDate: date }).strict().nullable();

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
        const value: unknown = JSON.parse(raw);
        const parsed = schema.safeParse(key === "ss_profile" || key === "ss_sessions" ? upgradeThemeNames(value) : value);
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
      displayName: "", selectedTheme: "rain-desk", timezone: defaultTimezone(), showStreak: true,
      reduceMotion: false, webcamEnabled: false, ambienceEnabled: false,
      comebackShownForDate: null,
      webcamCorner: "bottom-right",
      musicTrack: null, musicVolume: 0, roomVolume: 0,
      companionPreferences: soloCompanions(),
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
  private createSession(input: StartSessionInput, startedAt: Date, id: string): Session {
    const validated = inputSchema.parse(input);
    return { ...validated, id, startedAt: startedAt.toISOString(), endedAt: null, actualSeconds: 0,
      endedReason: null, localDate: toLocalDate(startedAt, this.profile().timezone) };
  }
  private finishSession(session: Session, reason: EndedReason, timestamp: Date): Session {
    const startedMs = new Date(session.startedAt).getTime();
    // Moving the development clock backwards must never produce negative time.
    const endedMs = Math.max(startedMs, timestamp.getTime());
    return { ...session, endedAt: new Date(endedMs).toISOString(), endedReason: reason,
      actualSeconds: Math.min(Math.floor((endedMs - startedMs) / 1000), 21600) };
  }

  async getProfile(): Promise<Profile> { return this.profile(); }
  private directoryProfile(): OwnProfile {
    const joinedAt = this.read("ss_directory_joined_at", iso, () => now().toISOString());
    this.write("ss_directory_joined_at", joinedAt);
    const fields = this.read("ss_directory_profile", profileEditSchema, () => ({
      displayName: this.profile().displayName || "ss_admin", bio: "", countryCode: "", occupation: "",
      interests: [], lookingFor: [], socials: [], isPublic: false,
    }));
    return { ...fields, displayName: this.profile().displayName || fields.displayName,
      id: "00000000-0000-4000-8000-000000000001", username: "ss_admin", joinedAt,
      avatarPath: null, bannerPath: null, followers: 0, following: 0, isFollowing: false, isSelf: true, isLocal: true };
  }
  async getDirectoryProfile(): Promise<OwnProfile> { return this.directoryProfile(); }
  updateDirectoryProfile(input: ProfileEdit): Promise<OwnProfile> {
    return this.mutate(() => {
      const fields = profileEditSchema.parse(input);
      // Preview profiles never publish, even if callers bypass the disabled UI.
      fields.isPublic = false;
      this.write("ss_directory_profile", fields);
      this.write("ss_profile", { ...this.profile(), displayName: fields.displayName });
      return this.directoryProfile();
    });
  }
  async getDashboard(): Promise<DashboardData> {
    // Local study has no live transport or remote directory. Never invent people.
    return { latestRoom: null, rooms: [], onlinePeople: [], capabilities: { humanRooms: false } };
  }
  updateProfile(patch: Partial<Profile>): Promise<Profile> {
    return this.mutate(() => { const profile = profileSchema.parse({ ...this.profile(), ...patch }); this.write("ss_profile", profile); return profile; });
  }
  async getActiveSession(): Promise<Session | null> { return this.active(this.sessions()); }
  startSession(input: StartSessionInput): Promise<Session> {
    return this.mutate(() => {
      const sessions = this.sessions();
      const active = this.active(sessions);
      if (active) return active;
      const session = this.createSession(input, now(), crypto.randomUUID());
      this.write("ss_sessions", [...sessions, session]);
      this.write("ss_active", { id: session.id, lastHeartbeatAt: session.startedAt });
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
      const ended = this.finishSession(session, reason, now());
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
  updateSessionCompanions(id: string, companions: CompanionPreferences): Promise<Session> {
    return this.mutate(() => {
      const validated = localCompanionSchema.parse(companions);
      const sessions = this.sessions();
      const session = sessions.find(value => value.id === id);
      if (!session || session.endedAt !== null) throw new Error("An active session is required");
      const updated = { ...session, companions: validated };
      this.write("ss_sessions", sessions.map(value => value.id === id ? updated : value));
      return updated;
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
  async getSessionHistory(query: SessionHistoryQuery): Promise<SessionHistoryPage> {
    return paginateHistory(this.sessions(), query);
  }
  async getTotalSecondsAllTime(): Promise<number> {
    return summarizeSessions(this.sessions()).totalSeconds;
  }
  async getStreak(): Promise<StreakState> { return this.streak(this.sessions()); }
  async getSessionSummary(): Promise<SessionSummary> { return summarizeSessions(this.sessions()); }
  async seedDemoSessions(): Promise<SessionSummary> {
    if (process.env.NODE_ENV !== "development") throw new Error("Development seed is unavailable");
    // Keep the development generator off the normal Start/session load path.
    const { generateSeedPlan, SEED_ID_PREFIX } = await import("@/lib/mock/seedPlan");
    return this.mutate(() => {
      const existing = this.sessions();
      if (this.active(existing)) throw new Error("Finish the active session before seeding");
      const marker = this.read("ss_dev_seed", seedSchema, () => null);
      if (marker || existing.some((session) => session.id.startsWith(SEED_ID_PREFIX))) return summarizeSessions(existing);
      const timestamp = now();
      const plan = generateSeedPlan(timestamp, this.profile().timezone);
      const seeded = plan.map(({ id, startedAt, endedAt, ...input }) => this.finishSession(this.createSession(input, new Date(startedAt), id), "completed", new Date(endedAt)));
      const combined = sessionsSchema.parse([...existing, ...seeded]);
      const eligible = combined.filter((session) => session.endedAt !== null && session.endedReason !== "abandoned")
        .sort((a, b) => a.localDate.localeCompare(b.localDate) || a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
      const previous = this.streak(existing);
      let state = initialStreak(eligible[0].localDate);
      const events = this.streakEvents();
      for (const session of eligible) {
        const activity = applyActivity(state, session.localDate);
        state = activity.state;
        if (session.id.startsWith(SEED_ID_PREFIX)) events[session.id] = { changed: activity.changed, freezeUsed: activity.freezeUsed };
      }
      state.best = Math.max(state.best, previous.best);
      this.write("ss_sessions", combined);
      this.write("ss_streak", state);
      this.write("ss_streak_events", events);
      this.write("ss_dev_seed", { version: 1, anchorDate: toLocalDate(timestamp, this.profile().timezone) });
      return summarizeSessions(combined);
    });
  }
}
