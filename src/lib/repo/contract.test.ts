import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalRepository } from "./local";
import type { Repository } from "./types";

vi.mock("@/lib/clock", () => ({ now: () => new Date(Date.now()) }));
const input = { plannedMinutes: 5, characterSlug: "rain-desk", task: "Read chapter one" };

// Keep this contract reusable when the remote implementation arrives.
export function repositoryContract(name: string, create: () => Repository) {
  describe(`${name} repository contract`, () => {
    let repo: Repository;
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-13T12:00:00Z")); repo = create(); });
    afterEach(() => vi.useRealTimers());

    it("returns the same active session for concurrent starts", async () => {
      const [first, second] = await Promise.all([repo.startSession(input), repo.startSession({ ...input, plannedMinutes: 25 })]);
      expect(second).toEqual(first);
      expect(await repo.getSessions({ limit: 20, offset: 0 })).toHaveLength(1);
      expect(await repo.getActiveSession()).toEqual(first);
      expect(first.actualSeconds).toBe(0);
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
  });
}

repositoryContract("Local", () => new LocalRepository(() => null));
