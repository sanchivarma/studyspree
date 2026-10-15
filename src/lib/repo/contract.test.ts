import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalRepository } from "./local";
import type { Repository } from "./types";

vi.mock("@/lib/clock", () => ({ now: () => new Date(Date.now()) }));
const input = { plannedMinutes: 5, themeSlug: "rain-desk", task: "Read chapter one" };

// Keep this contract reusable when the remote implementation arrives.
export function repositoryContract(name: string, create: () => Repository) {
  describe(`${name} repository contract`, () => {
    let repo: Repository;
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-13T12:00:00Z")); repo = create(); });
    afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

    it("returns the same active session for concurrent starts", async () => {
      const [first, second] = await Promise.all([repo.startSession(input), repo.startSession({ ...input, plannedMinutes: 25 })]);
      expect(second).toEqual(first);
      expect(await repo.getSessions({ limit: 20, offset: 0 })).toHaveLength(1);
      expect(await repo.getActiveSession()).toEqual(first);
      expect(first.actualSeconds).toBe(0);
    });
    it("exposes an honest local dashboard without fictitious live participants", async () => {
      expect(await repo.getDashboard()).toEqual({ latestRoom: null, rooms: [], onlinePeople: [], capabilities: { humanRooms: false } });
      expect(await repo.getActiveSession()).toBeNull();
    });
    it("filters ended session history by companion mode and saved dates", async () => {
      const first = await repo.startSession(input);
      await repo.endSession(first.id, "completed");
      const second = await repo.startSession({ ...input, companions: { mode: "characters", characterSlugs: ["female-04"] } });
      vi.advanceTimersByTime(10000); await repo.endSession(second.id, "stopped_early");
      await repo.startSession(input);
      const history = await repo.getSessionHistory({ from: first.localDate, to: first.localDate, companionMode: "characters", limit: 20 });
      expect(history.items.map(session => session.id)).toEqual([second.id]);
      expect(history.nextCursor).toBeNull();
      expect((await repo.getSessionHistory({ limit: 20 })).items).toHaveLength(2);
    });
    it("persists companion preferences and snapshots without changing timer accounting", async () => {
      expect((await repo.getProfile()).companionPreferences).toEqual({ mode: "solo", characterSlugs: [] });
      const companions = { mode: "characters" as const, characterSlugs: ["male-01", "female-04"] as ("male-01" | "female-04")[] };
      await repo.updateProfile({ companionPreferences: companions });
      const session = await repo.startSession({ ...input, companions });
      await repo.updateProfile({ companionPreferences: { mode: "solo", characterSlugs: [] } });
      expect((await repo.getActiveSession())?.companions).toEqual(companions);
      vi.advanceTimersByTime(10000);
      const changed = await repo.updateSessionCompanions(session.id, { mode: "characters", characterSlugs: ["female-02"] });
      expect(changed.startedAt).toBe(session.startedAt);
      expect(changed.actualSeconds).toBe(0);
      expect(await repo.getTotalSecondsAllTime()).toBe(0);
      const ended = await repo.endSession(session.id, "stopped_early");
      expect(ended.session.actualSeconds).toBe(10);
      expect(ended.session.companions.characterSlugs).toEqual(["female-02"]);
      await expect(repo.updateSessionCompanions(session.id, { mode: "solo", characterSlugs: [] })).rejects.toThrow();
    });
    it("rejects invalid companion input without overwriting existing history", async () => {
      const first = await repo.startSession(input);
      await repo.endSession(first.id, "completed");
      const history = await repo.getSessions({ limit: 20, offset: 0 });
      await expect(repo.startSession({ ...input, companions: { mode: "characters", characterSlugs: [] } })).rejects.toThrow();
      expect(await repo.getSessions({ limit: 20, offset: 0 })).toEqual(history);
    });
    it("persists a daily comeback marker without changing hours, history, or streak", async () => {
      expect((await repo.getProfile()).comebackShownForDate).toBeNull();
      const session = await repo.startSession(input);
      vi.advanceTimersByTime(10000); await repo.endSession(session.id, "completed");
      const streak = await repo.getStreak();
      const sessions = await repo.getSessions({ limit: 20, offset: 0 });
      await repo.updateProfile({ comebackShownForDate: "2026-10-13" });
      expect((await repo.getProfile()).comebackShownForDate).toBe("2026-10-13");
      expect(await repo.getTotalSecondsAllTime()).toBe(10);
      expect(await repo.getStreak()).toEqual(streak);
      expect(await repo.getSessions({ limit: 20, offset: 0 })).toEqual(sessions);
    });
    it("keeps camera opt-in and corner preferences separate from session time", async () => {
      expect(await repo.getProfile()).toMatchObject({ webcamEnabled: false, webcamCorner: "bottom-right" });
      const session = await repo.startSession(input);
      await repo.updateProfile({ webcamEnabled: true, webcamCorner: "top-left" });
      expect(await repo.getProfile()).toMatchObject({ webcamEnabled: true, webcamCorner: "top-left" });
      expect(await repo.getActiveSession()).toEqual(session);
      expect(await repo.getTotalSecondsAllTime()).toBe(0);
      await repo.updateProfile({ webcamEnabled: false });
      expect(await repo.getProfile()).toMatchObject({ webcamEnabled: false, webcamCorner: "top-left" });
      vi.advanceTimersByTime(10000);
      expect((await repo.endSession(session.id, "stopped_early")).session.actualSeconds).toBe(10);
    });
    it("stores independent ambience preferences without changing session timestamps or totals", async () => {
      expect(await repo.getProfile()).toMatchObject({ ambienceEnabled: false, musicTrack: null, musicVolume: 0, roomVolume: 0 });
      const session = await repo.startSession(input);
      await repo.updateProfile({ ambienceEnabled: true, musicTrack: "silent", musicVolume: 0.2, roomVolume: 0.7 });
      expect(await repo.getProfile()).toMatchObject({ ambienceEnabled: true, musicTrack: "silent", musicVolume: 0.2, roomVolume: 0.7 });
      expect(await repo.getActiveSession()).toEqual(session);
      await expect(repo.updateProfile({ roomVolume: 2 })).rejects.toThrow();
      expect((await repo.getProfile()).roomVolume).toBe(0.7);
      expect(await repo.getTotalSecondsAllTime()).toBe(0);
    });
    it("seeds internally consistent history once using the profile timezone", async () => {
      vi.stubEnv("NODE_ENV", "development");
      await repo.updateProfile({ timezone: "America/Los_Angeles" });
      const summary = await repo.seedDemoSessions();
      expect(summary.totalSeconds).toBe(144000);
      const sessions = await repo.getSessions({ limit: 1000, offset: 0 });
      expect(summary.sessionCount).toBe(sessions.length);
      expect(new Set(sessions.map((session) => session.themeSlug)).size).toBe(4);
      expect(new Set(sessions.map((session) => session.plannedMinutes))).toEqual(new Set([5, 15, 25, 50]));
      for (const session of sessions) expect(session.actualSeconds).toBe((new Date(session.endedAt!).getTime() - new Date(session.startedAt).getTime()) / 1000);
      expect(await repo.getStreak()).toMatchObject({ current: 6, lastActiveDate: "2026-10-11" });
      const days = await repo.getDayStats("2026-07-01", "2026-10-13");
      expect(days.reduce((sum, day) => sum + day.totalSeconds, 0)).toBe(summary.totalSeconds);
      expect(await repo.seedDemoSessions()).toEqual(summary);
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      expect(await repo.seedDemoSessions()).toEqual(summary);
      expect(await repo.getSessions({ limit: 1000, offset: 0 })).toEqual(sessions);
      expect(await repo.getActiveSession()).toBeNull();
    });
    it("seeding preserves existing sessions, time, and a larger best streak", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const session = await repo.startSession(input);
      vi.advanceTimersByTime(10000); await repo.endSession(session.id, "completed");
      const before = await repo.getStreak();
      const result = await repo.seedDemoSessions();
      expect(result.totalSeconds).toBe(144010);
      expect((await repo.getSessions({ limit: 1000, offset: 0 })).find((entry) => entry.id === session.id)).toMatchObject({ actualSeconds: 10, startedAt: session.startedAt });
      expect((await repo.getStreak()).best).toBeGreaterThanOrEqual(before.best);
    });
    it("refuses development seeding in production or during a running session", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await expect(repo.seedDemoSessions()).rejects.toThrow("Development seed is unavailable");
      expect(await repo.getTotalSecondsAllTime()).toBe(0);
      vi.stubEnv("NODE_ENV", "development");
      const session = await repo.startSession(input);
      await expect(repo.seedDemoSessions()).rejects.toThrow("Finish the active session");
      expect(await repo.getActiveSession()).toEqual(session);
      expect(await repo.getTotalSecondsAllTime()).toBe(0);
    });
    it("banks floored timestamp seconds and clears the active session", async () => {
      const session = await repo.startSession(input);
      vi.advanceTimersByTime(10_999);
      const result = await repo.endSession(session.id, "stopped_early");
      expect(result.session).toMatchObject({ actualSeconds: 10, endedReason: "stopped_early", endedAt: "2026-10-13T12:00:10.999Z" });
      expect(result).toMatchObject({ totalSecondsAllTime: 10, dayTotalSeconds: 10 });
      expect(await repo.getActiveSession()).toBeNull();
      expect(await repo.getTotalSecondsAllTime()).toBe(10);
    });
    it("caps a ten-hour session at six hours", async () => {
      const session = await repo.startSession(input);
      vi.advanceTimersByTime(10 * 3600_000);
      expect((await repo.endSession(session.id, "completed")).session.actualSeconds).toBe(21600);
    });
    it("finishing twice preserves stored timestamps, reason and banked time", async () => {
      const session = await repo.startSession(input);
      vi.advanceTimersByTime(10_000);
      const ended = await repo.endSession(session.id, "stopped_early");
      vi.advanceTimersByTime(600_000);
      expect(await repo.endSession(session.id, "completed")).toEqual(ended);
      expect(await repo.getTotalSecondsAllTime()).toBe(10);
    });
    it("stores profile updates and buckets totals in the profile timezone", async () => {
      await repo.updateProfile({ displayName: "Alex", timezone: "America/Los_Angeles", showStreak: false });
      expect(await repo.getProfile()).toMatchObject({ displayName: "Alex", timezone: "America/Los_Angeles", showStreak: false });
      vi.setSystemTime(new Date("2026-10-13T00:05:00Z"));
      const first = await repo.startSession(input);
      expect(first.localDate).toBe("2026-10-12");
      vi.advanceTimersByTime(60_000);
      await repo.endSession(first.id, "completed");
      const second = await repo.startSession({ ...input, plannedMinutes: null, task: null });
      vi.advanceTimersByTime(120_000);
      expect(await repo.endSession(second.id, "stopped_early")).toMatchObject({ totalSecondsAllTime: 180, dayTotalSeconds: 180 });
      expect(await repo.getDayStats("2026-10-12", "2026-10-12")).toEqual([{ date: "2026-10-12", totalSeconds: 180, sessionCount: 2 }]);
      expect(await repo.getDayStats("2026-10-13", "2026-10-14")).toEqual([]);
      expect((await repo.getSessions({ limit: 1, offset: 0 }))[0].id).toBe(second.id);
      expect((await repo.getSessions({ limit: 1, offset: 1 }))[0].id).toBe(first.id);
    });
    it("heartbeat never adds time or changes the start timestamp", async () => {
      const session = await repo.startSession(input);
      vi.advanceTimersByTime(60_000);
      await repo.heartbeat(session.id);
      await repo.heartbeat("unknown");
      expect(await repo.getActiveSession()).toEqual(session);
      expect(await repo.getTotalSecondsAllTime()).toBe(0);
      expect(await repo.getDayStats("2026-10-13", "2026-10-13")).toEqual([]);
    });
    it("starts with empty session and streak summaries", async () => {
      expect(await repo.getSessionSummary()).toEqual({ totalSeconds: 0, sessionCount: 0, firstSessionDate: null });
      expect(await repo.getStreak()).toEqual({ current: 0, best: 0, lastActiveDate: null, freezesRemaining: 2, freezesResetAt: "2026-11-01" });
    });
    it("applies completed and early-stop activity once per saved date", async () => {
      const first = await repo.startSession(input);
      vi.advanceTimersByTime(10000);
      expect((await repo.endSession(first.id, "completed")).streak).toEqual({ current: 1, best: 1, changed: true, freezeUsed: false });
      const second = await repo.startSession(input);
      vi.advanceTimersByTime(10000);
      expect((await repo.endSession(second.id, "stopped_early")).streak).toEqual({ current: 1, best: 1, changed: false, freezeUsed: false });
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      const third = await repo.startSession(input);
      vi.advanceTimersByTime(10000);
      expect((await repo.endSession(third.id, "stopped_early")).streak).toEqual({ current: 2, best: 2, changed: true, freezeUsed: false });
      expect(await repo.getSessionSummary()).toEqual({ totalSeconds: 30, sessionCount: 3, firstSessionDate: "2026-10-13" });
    });
    it("uses a freeze for a two-day gap and returns the same event on retry", async () => {
      const first = await repo.startSession(input);
      vi.advanceTimersByTime(10000); await repo.endSession(first.id, "completed");
      vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
      const second = await repo.startSession(input);
      vi.advanceTimersByTime(10000);
      const result = await repo.endSession(second.id, "stopped_early");
      expect(result.streak).toEqual({ current: 2, best: 2, changed: true, freezeUsed: true });
      const state = await repo.getStreak();
      expect(state.freezesRemaining).toBe(1);
      vi.advanceTimersByTime(10000);
      expect(await repo.endSession(second.id, "completed")).toEqual(result);
      expect(await repo.getStreak()).toEqual(state);
    });
    it("abandoned sessions bank time but never change a streak", async () => {
      const initial = await repo.getStreak();
      const session = await repo.startSession(input);
      vi.advanceTimersByTime(10000);
      const result = await repo.endSession(session.id, "abandoned");
      expect(result).toMatchObject({ totalSecondsAllTime: 10, streak: { current: 0, best: 0, changed: false, freezeUsed: false } });
      expect(await repo.getStreak()).toEqual(initial);
      expect((await repo.endSession(session.id, "completed")).session.endedReason).toBe("abandoned");
      expect(await repo.getStreak()).toEqual(initial);
    });
    it("keeps historical day buckets after profile timezone changes", async () => {
      await repo.updateProfile({ timezone: "America/Los_Angeles" });
      vi.setSystemTime(new Date("2026-10-13T00:05:00Z"));
      const first = await repo.startSession(input);
      await repo.updateProfile({ timezone: "Asia/Tokyo" });
      vi.advanceTimersByTime(10000); await repo.endSession(first.id, "completed");
      const second = await repo.startSession(input);
      vi.advanceTimersByTime(10000); await repo.endSession(second.id, "completed");
      expect(first.localDate).toBe("2026-10-12");
      expect(second.localDate).toBe("2026-10-13");
      expect(await repo.getDayStats("2026-10-12", "2026-10-13")).toEqual([
        { date: "2026-10-12", totalSeconds: 10, sessionCount: 1 },
        { date: "2026-10-13", totalSeconds: 10, sessionCount: 1 },
      ]);
      expect((await repo.getStreak()).lastActiveDate).toBe("2026-10-13");
    });
    it("maintains lifetime totals and day-sum equality after every operation in a session sequence", async () => {
      let previousTotal = 0;
      const check = async () => {
        const total = await repo.getTotalSecondsAllTime();
        const days = await repo.getDayStats("2020-01-01", "2030-12-31");
        const summary = await repo.getSessionSummary();
        expect(total).toBeGreaterThanOrEqual(previousTotal);
        expect(days.reduce((sum, day) => sum + day.totalSeconds, 0)).toBe(total);
        expect(summary.totalSeconds).toBe(total);
        expect(days.reduce((sum, day) => sum + day.sessionCount, 0)).toBe(summary.sessionCount);
        previousTotal = total;
      };
      await check();
      for (const [index, duration] of [0, 1, 10, 120, 36000, 60].entries()) {
        vi.setSystemTime(new Date(`2026-10-${String(13 + index * 2).padStart(2, "0")}T12:00:00Z`));
        const session = await repo.startSession(input); await check();
        await repo.startSession(input); await check();
        vi.advanceTimersByTime(duration * 1000);
        await repo.heartbeat(session.id); await check();
        const reason = index % 3 === 0 ? "completed" : index % 3 === 1 ? "stopped_early" : "abandoned";
        await repo.endSession(session.id, reason); await check();
        vi.advanceTimersByTime(10000);
        await repo.endSession(session.id, "completed"); await check();
        await repo.updateProfile({ timezone: index % 2 ? "Europe/Berlin" : "America/Los_Angeles", showStreak: false }); await check();
        await repo.getStreak(); await check();
        await repo.getSessions({ limit: 20, offset: 0 }); await check();
      }
      expect(previousTotal).toBe(21791);
    });
  });
}

repositoryContract("Local", () => new LocalRepository(() => null));
