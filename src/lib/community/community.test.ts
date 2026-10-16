import { describe, expect, it } from "vitest";
import { partnerOverlaps, type PresenceInterval } from "./overlaps";
import { resolveCalendarTime } from "./calendar";
import { communityCommandSchema } from "./schemas";
import { hasClientDuration, repositoryRequestSchema } from "@/lib/repo/remoteSchemas";
const visit = (userId: string, startedAt: string, endedAt: string, roomId = "room"): PresenceInterval => ({ userId, startedAt, endedAt, roomId });
describe("partner interval accounting", () => {
    it("unions duplicate and intersecting visits without double-counting", () => {
        const data = [visit("me", "2026-10-01T10:00Z", "2026-10-01T12:00Z"), visit("other", "2026-10-01T10:30Z", "2026-10-01T11:30Z"), visit("other", "2026-10-01T11:00Z", "2026-10-01T12:30Z")];
        expect(partnerOverlaps([...data, ...data], "me", "UTC")).toEqual([{ partnerId: "other", totalSeconds: 5400, days: 1 }]);
    });
    it("does not count different rooms, touching endpoints or disjoint visits", () => {
        expect(partnerOverlaps([visit("me", "2026-10-01T10:00Z", "2026-10-01T11:00Z"), visit("a", "2026-10-01T11:00Z", "2026-10-01T12:00Z"), visit("b", "2026-10-01T10:00Z", "2026-10-01T11:00Z", "elsewhere")], "me", "UTC")).toEqual([]);
    });
    it("uses profile-zone dates with an exclusive midnight endpoint", () => {
        const data = [visit("me", "2026-10-01T21:00Z", "2026-10-01T22:00Z"), visit("other", "2026-10-01T21:00Z", "2026-10-01T22:00Z")];
        expect(partnerOverlaps(data, "me", "Europe/Berlin")[0]).toMatchObject({ totalSeconds: 3600, days: 1 });
    });
    it("keeps seconds and local days correct through a DST fall-back", () => {
        const data = [visit("me", "2026-10-24T22:00Z", "2026-10-26T00:00Z"), visit("other", "2026-10-24T22:00Z", "2026-10-26T00:00Z")];
        expect(partnerOverlaps(data, "me", "Europe/Berlin")[0]).toMatchObject({ totalSeconds: 93600, days: 2 });
    });
});
describe("timezone-safe scheduling", () => {
    it("rejects nonexistent spring-forward times", () => expect(() => resolveCalendarTime("2026-03-29T02:30", "Europe/Berlin")).toThrow());
    it("disambiguates both occurrences of a repeated hour", () => {
        expect(resolveCalendarTime("2026-10-25T02:30", "Europe/Berlin", "earlier")).toBe("2026-10-25T00:30:00.000Z");
        expect(resolveCalendarTime("2026-10-25T02:30", "Europe/Berlin", "later")).toBe("2026-10-25T01:30:00.000Z");
    });
    it("round-trips an ordinary date in another timezone", () => expect(resolveCalendarTime("2026-10-16T09:00", "America/New_York")).toBe("2026-10-16T13:00:00.000Z"));
});
describe("strict client boundaries", () => {
    it("keeps partial profile updates from resetting omitted preferences",()=>{
      const result=repositoryRequestSchema.parse({op:"updateProfile",patch:{showStreak:false}});
      expect(result).toEqual({op:"updateProfile",patch:{showStreak:false}});
    });
    it("rejects caller-owned identities, durations and unknown mutation operations", () => {
        expect(communityCommandSchema.safeParse({ action: "task.create", data: { title: "Read", date: "2026-10-16", userId: crypto.randomUUID() } }).success).toBe(false);
        expect(communityCommandSchema.safeParse({ action: "admin.grant", data: {} }).success).toBe(false);
        expect(repositoryRequestSchema.safeParse({ op: "start", input: { plannedMinutes: 25, themeSlug: "rain-desk", task: null, actualSeconds: 3600 } }).success).toBe(false);
        expect(hasClientDuration({ nested: [{ actual_seconds: 1 }] })).toBe(true);
        expect(hasClientDuration({ command: { action: "room.join", data: { id: crypto.randomUUID() } } })).toBe(false);
    });
});
