import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalRepository } from "./local";

const time = vi.hoisted(() => ({ milliseconds: 0 }));
vi.mock("@/lib/clock", () => ({ now: () => new Date(time.milliseconds) }));
const input = { plannedMinutes: 5, characterSlug: "rain-desk", task: null };
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}

beforeEach(() => { time.milliseconds = new Date("2026-10-13T12:00:00Z").getTime(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("local persistence and recovery", () => {
  it("initializes freeze reset dates from the profile timezone at a month boundary", async () => {
    const repo = new LocalRepository(() => null);
    await repo.updateProfile({ timezone: "America/Los_Angeles" });
    time.milliseconds = new Date("2026-11-01T00:05:00Z").getTime();
    expect((await repo.getStreak()).freezesResetAt).toBe("2026-11-01");
  });
  it("repairs corrupt event flags without applying the session activity again", async () => {
    const storage = memoryStorage();
    const repo = new LocalRepository(() => storage);
    const a = await repo.startSession(input); time.milliseconds += 10000; await repo.endSession(a.id, "completed");
    time.milliseconds = new Date("2026-10-15T12:00:00Z").getTime();
    const b = await repo.startSession(input); time.milliseconds += 10000; await repo.endSession(b.id, "completed");
    const state = await repo.getStreak();
    for (const corrupt of ["{broken", JSON.stringify({ [b.id]: { changed: "forged", freezeUsed: true } })]) {
      storage.setItem("ss_streak_events", corrupt);
      expect((await repo.endSession(b.id, "stopped_early")).streak).toMatchObject({ current: 2, best: 2, changed: false, freezeUsed: false });
      expect(await repo.getStreak()).toEqual(state);
      expect(JSON.parse(storage.getItem("ss_streak_events")!)).toEqual({});
      expect(await repo.getTotalSecondsAllTime()).toBe(20);
    }
  });
  it("persists streaks and freeze events across reloads without spending twice", async () => {
    const storage = memoryStorage();
    const first = new LocalRepository(() => storage);
    const initial = await first.startSession(input);
    time.milliseconds += 10000; await first.endSession(initial.id, "completed");
    time.milliseconds = new Date("2026-10-15T12:00:00Z").getTime();
    const session = await first.startSession(input);
    time.milliseconds += 10000;
    const ended = await first.endSession(session.id, "stopped_early");
    const state = await first.getStreak();
    expect(JSON.parse(storage.getItem("ss_streak")!)).toEqual(state);
    expect(state).toMatchObject({ current: 2, best: 2, freezesRemaining: 1 });
    const reloaded = new LocalRepository(() => storage);
    expect(await reloaded.getStreak()).toEqual(state);
    time.milliseconds += 10000;
    expect(await reloaded.endSession(session.id, "completed")).toEqual(ended);
    expect(await reloaded.getStreak()).toEqual(state);
    expect(await reloaded.getSessionSummary()).toEqual({ totalSeconds: 20, sessionCount: 2, firstSessionDate: "2026-10-13" });
  });
  it("reconstructs missing or corrupt streak storage from eligible historical dates", async () => {
    const storage = memoryStorage();
    const first = new LocalRepository(() => storage);
    const a = await first.startSession(input); time.milliseconds += 10000; await first.endSession(a.id, "completed");
    time.milliseconds = new Date("2026-10-15T12:00:00Z").getTime();
    const b = await first.startSession(input); time.milliseconds += 10000; await first.endSession(b.id, "stopped_early");
    time.milliseconds = new Date("2026-10-17T12:00:00Z").getTime();
    const c = await first.startSession(input); time.milliseconds += 10000; await first.endSession(c.id, "abandoned");
    const expected = await first.getStreak();
    for (const value of [null, "{broken", JSON.stringify({ current: -1 }), JSON.stringify({ ...expected, freezesRemaining: 9 })]) {
      if (value === null) storage.removeItem("ss_streak"); else storage.setItem("ss_streak", value);
      const repo = new LocalRepository(() => storage);
      expect(await repo.getStreak()).toEqual(expected);
      expect(await repo.getTotalSecondsAllTime()).toBe(30);
      if (value !== null) expect(JSON.parse(storage.getItem("ss_streak")!)).toEqual(expected);
    }
  });
  it("keeps an existing best on lapse and refills before consuming a new-month freeze", async () => {
    const storage = memoryStorage();
    storage.setItem("ss_streak", JSON.stringify({ current: 7, best: 40, lastActiveDate: "2026-10-31", freezesRemaining: 0, freezesResetAt: "2026-11-01" }));
    const repo = new LocalRepository(() => storage);
    time.milliseconds = new Date("2026-11-02T12:00:00Z").getTime();
    const a = await repo.startSession(input); time.milliseconds += 10000;
    expect((await repo.endSession(a.id, "completed")).streak).toEqual({ current: 8, best: 40, changed: true, freezeUsed: true });
    expect(await repo.getStreak()).toMatchObject({ freezesRemaining: 1, freezesResetAt: "2026-12-01" });
    time.milliseconds = new Date("2026-11-07T12:00:00Z").getTime();
    const b = await repo.startSession(input); time.milliseconds += 10000;
    expect((await repo.endSession(b.id, "stopped_early")).streak).toEqual({ current: 1, best: 40, changed: true, freezeUsed: false });
    expect(await repo.getTotalSecondsAllTime()).toBe(20);
  });
  it("abandoned sessions leave the persisted streak bytes untouched", async () => {
    const storage = memoryStorage();
    const repo = new LocalRepository(() => storage);
    const a = await repo.startSession(input); time.milliseconds += 10000; await repo.endSession(a.id, "completed");
    const before = storage.getItem("ss_streak");
    time.milliseconds = new Date("2026-10-17T12:00:00Z").getTime();
    const b = await repo.startSession(input); time.milliseconds += 10000; await repo.endSession(b.id, "abandoned");
    expect(storage.getItem("ss_streak")).toBe(before);
  });
  it("finishing after local midnight keeps the start-date bucket and streak activity date", async () => {
    const repo = new LocalRepository(() => null);
    await repo.updateProfile({ timezone: "Europe/Berlin" });
    time.milliseconds = new Date("2026-10-13T21:59:50Z").getTime();
    const session = await repo.startSession(input); time.milliseconds += 20000;
    await repo.endSession(session.id, "completed");
    expect(await repo.getDayStats("2026-10-13", "2026-10-14")).toEqual([{ date: "2026-10-13", totalSeconds: 20, sessionCount: 1 }]);
    expect((await repo.getStreak()).lastActiveDate).toBe("2026-10-13");
  });
  it("resumes persisted timestamps in a fresh repository after a long sleep", async () => {
    const storage = memoryStorage();
    const first = new LocalRepository(() => storage);
    const session = await first.startSession(input);
    time.milliseconds += 600_000;
    const resumed = new LocalRepository(() => storage);
    expect(await resumed.getActiveSession()).toEqual(session);
    expect((await resumed.endSession(session.id, "completed")).session.actualSeconds).toBe(600);
    expect(await new LocalRepository(() => storage).getTotalSecondsAllTime()).toBe(600);
  });
  it("observes other repository instances instead of using a stale memory cache", async () => {
    const storage = memoryStorage();
    const first = new LocalRepository(() => storage);
    const second = new LocalRepository(() => storage);
    expect(await second.getActiveSession()).toBeNull();
    const session = await first.startSession(input);
    expect((await second.startSession(input)).id).toBe(session.id);
    time.milliseconds += 10_000;
    await second.endSession(session.id, "stopped_early");
    expect(await first.getActiveSession()).toBeNull();
    expect(await first.getTotalSecondsAllTime()).toBe(10);
  });
  it("serializes concurrent tab mutations through the same Web Lock", async () => {
    let queue: Promise<unknown> = Promise.resolve();
    const request = vi.fn((_name: string, operation: () => unknown) => {
      const pending = queue.then(operation);
      queue = pending.catch(() => {});
      return pending;
    });
    vi.stubGlobal("navigator", { locks: { request } });
    const storage = memoryStorage();
    const first = new LocalRepository(() => storage);
    const second = new LocalRepository(() => storage);
    const [a, b] = await Promise.all([first.startSession(input), second.startSession(input)]);
    expect(a).toEqual(b);
    time.milliseconds += 10_000;
    const results = await Promise.all([first.endSession(a.id, "completed"), second.endSession(a.id, "stopped_early")]);
    expect(results[0]).toEqual(results[1]);
    expect(await first.getTotalSecondsAllTime()).toBe(10);
    expect(request.mock.calls.every(([name]) => name === "ss_repository")).toBe(true);
  });
  it("persists heartbeat timestamps without accepting a duration", async () => {
    const storage = memoryStorage();
    const repo = new LocalRepository(() => storage);
    const session = await repo.startSession(input);
    time.milliseconds += 10_000;
    await repo.heartbeat(session.id);
    expect(JSON.parse(storage.getItem("ss_active")!)).toEqual({ id: session.id, lastHeartbeatAt: "2026-10-13T12:00:10.000Z" });
    expect(await repo.getActiveSession()).toEqual(session);
    await repo.endSession(session.id, "completed");
    await repo.heartbeat(session.id);
    expect(JSON.parse(storage.getItem("ss_active")!)).toBeNull();
  });
  it.each(["ss_profile", "ss_sessions", "ss_active"])("repairs corrupt JSON in %s", async (key) => {
    const storage = memoryStorage(); storage.setItem(key, "{broken");
    const repo = new LocalRepository(() => storage);
    await repo.getProfile(); await repo.getActiveSession();
    expect(() => JSON.parse(storage.getItem(key)!)).not.toThrow();
    const session = await repo.startSession(input);
    expect((await repo.getActiveSession())?.id).toBe(session.id);
  });
  it("validates parseable storage with Zod and leaves other keys intact", async () => {
    const storage = memoryStorage();
    const repo = new LocalRepository(() => storage);
    await repo.updateProfile({ displayName: "Alex" });
    storage.setItem("ss_sessions", JSON.stringify([{ actualSeconds: "forged" }]));
    storage.setItem("ss_active", JSON.stringify({ id: 7 }));
    expect(await repo.getActiveSession()).toBeNull();
    expect(await repo.getSessions({ limit: 20, offset: 0 })).toEqual([]);
    expect((await repo.getProfile()).displayName).toBe("Alex");
  });
  it("recovers the active session if its pointer is missing", async () => {
    const storage = memoryStorage();
    const session = await new LocalRepository(() => storage).startSession(input);
    storage.removeItem("ss_active");
    expect(await new LocalRepository(() => storage).getActiveSession()).toEqual(session);
  });
  it("uses memory when storage access itself is denied", async () => {
    const repo = new LocalRepository(() => { throw new Error("SecurityError"); });
    const session = await repo.startSession(input);
    time.milliseconds += 12_000;
    expect((await repo.endSession(session.id, "stopped_early")).totalSecondsAllTime).toBe(12);
    expect(await repo.getActiveSession()).toBeNull();
  });
  it("uses memory when writes fail while reads still return old values", async () => {
    const storage = memoryStorage();
    const repo = new LocalRepository(() => storage);
    const session = await repo.startSession(input);
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    time.milliseconds += 15_000;
    await repo.endSession(session.id, "stopped_early");
    expect(await repo.getActiveSession()).toBeNull();
    expect(await repo.getTotalSecondsAllTime()).toBe(15);
    expect(await repo.getStreak()).toMatchObject({ current: 1, best: 1 });
    expect(await repo.getSessionSummary()).toMatchObject({ totalSeconds: 15, sessionCount: 1 });
    await repo.updateProfile({ displayName: "Alex" });
    expect((await repo.getProfile()).displayName).toBe("Alex");
  });
  it("uses the last readable data when subsequent reads fail", async () => {
    const storage = memoryStorage();
    const repo = new LocalRepository(() => storage);
    const session = await repo.startSession(input);
    vi.spyOn(storage, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    expect(await repo.getActiveSession()).toEqual(session);
  });
  it("does not bank negative seconds when the dev clock moves backwards", async () => {
    const repo = new LocalRepository(() => null);
    const session = await repo.startSession(input);
    time.milliseconds -= 60_000;
    expect((await repo.endSession(session.id, "stopped_early")).session).toMatchObject({ actualSeconds: 0, endedAt: session.startedAt });
  });
  it("repeated Finish on an older session leaves a newer active session intact", async () => {
    const repo = new LocalRepository(() => null);
    const first = await repo.startSession(input);
    time.milliseconds += 10_000; await repo.endSession(first.id, "completed");
    const second = await repo.startSession(input);
    await repo.endSession(first.id, "stopped_early");
    expect(await repo.getActiveSession()).toEqual(second);
    expect(await repo.getTotalSecondsAllTime()).toBe(10);
  });
  it("rejects invalid inputs without altering data", async () => {
    const repo = new LocalRepository(() => null);
    await expect(repo.startSession({ ...input, plannedMinutes: -1 })).rejects.toThrow();
    await expect(repo.startSession({ ...input, actualSeconds: 999 } as typeof input)).rejects.toThrow();
    await expect(repo.updateProfile({ timezone: "invalid/timezone" })).rejects.toThrow();
    await expect(repo.endSession("unknown", "completed")).rejects.toThrow("Session not found");
    await expect(repo.getSessions({ limit: -1, offset: 0 })).rejects.toThrow();
    await expect(repo.getDayStats("2026-02-30", "2026-03-01")).rejects.toThrow();
    expect(await repo.getActiveSession()).toBeNull();
    expect(await repo.getTotalSecondsAllTime()).toBe(0);
  });
});
