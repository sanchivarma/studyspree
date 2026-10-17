import { z } from "zod";
import type { Repository, StartSessionInput } from "./types";
import { profileSchema, sessionSchema, streakSchema } from "./local";
import { daySchema, summarySchema } from "./remoteSchemas";
import { ownProfileSchema, type ProfileEdit } from "@/lib/profiles/schemas";
import { awardSchema } from "@/lib/achievements/eligibility";
import { tileSchema, type TilePatch } from "@/lib/personalTile/schemas";
import type { Profile, EndedReason } from "@/types/domain";
import type { CompanionPreferences } from "@/types/characters";
import type { SessionHistoryQuery } from "@/types/stats";
import { tileHistorySchema } from "@/types/tileStatus";
import { characterHistorySchema } from "@/types/focusPartners";
const room = z.object({ id: z.uuid(), name: z.string(), description: z.string(), humanCount: z.number(), access: z.enum(["public", "members", "invite"]), canJoin: z.boolean() });
export class SupabaseRepository implements Repository {
    private async call<T>(op: string, schema: z.ZodType<T>, args: object = {}): Promise<T> {
        const response = await fetch("/api/repository", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, ...args }), cache: "no-store" });
        if (response.status === 401) {
            window.location.assign("/login");
            throw new Error("unauthorized");
        }
        if (!response.ok)
            throw new Error("Repository unavailable");
        return schema.parse(await response.json());
    }
    getProfile() { return this.call("profile", profileSchema); }
    updateProfile(patch: Partial<Profile>) { return this.call("updateProfile", profileSchema, { patch }); }
    getDirectoryProfile() { return this.call("directory", ownProfileSchema); }
    updateDirectoryProfile(input: ProfileEdit) { return this.call("updateDirectory", ownProfileSchema, { input }); }
    getAchievements() { return this.call("awards", z.array(awardSchema)); }
    getEarnedAchievements() { return this.call("earnedAchievements", z.array(z.object({ achievementId: z.string(), earnedAt: z.iso.datetime({ offset: true }) }))); }
    getCharacterCompanionHistory() { return this.call("characterHistory", characterHistorySchema); }
    getTileStatusHistory(opts: { cursor?: string | null; limit: number }) { return this.call("tileHistory", tileHistorySchema, opts); }
    getPersonalTile() { return this.call("tile", tileSchema); }
    updatePersonalTile(patch: TilePatch) { return this.call("updateTile", tileSchema, { patch }); }
    getActiveSession() { return this.call("active", sessionSchema.nullable()); }
    getSession(id: string) { return this.call("session", sessionSchema.nullable(), { id }); }
    startSession(input: StartSessionInput) { return this.call("start", sessionSchema, { input }); }
    endSession(id: string, reason: EndedReason) { return this.call("finish", z.object({ session: sessionSchema, totalSecondsAllTime: z.number(), dayTotalSeconds: z.number(), streak: z.object({ current: z.number(), best: z.number(), changed: z.boolean(), freezeUsed: z.boolean() }) }), { id, reason }); }
    async heartbeat(id: string) { await this.call("heartbeat", z.null(), { id }); }
    updateSessionCompanions(id: string, companions: CompanionPreferences) { return this.call("companions", sessionSchema, { id, companions }); }
    getSessions(opts: {
        limit: number;
        offset: number;
    }) { return this.call("sessions", z.array(sessionSchema), opts); }
    getSessionHistory(query: SessionHistoryQuery) { return this.call("history", z.object({ items: z.array(sessionSchema), nextCursor: z.string().nullable() }), { query }); }
    getDayStats(from: string, to: string) { return this.call("days", z.array(daySchema), { from, to }); }
    getTotalSecondsAllTime() { return this.call("total", z.number().nonnegative()); }
    getSessionSummary() { return this.call("summary", summarySchema); }
    getStreak() { return this.call("streak", streakSchema); }
    getDashboard() { return this.call("dashboard", z.object({ activeRoomId: z.uuid().nullable().optional(), latestRoom: room.nullable(), rooms: z.array(room), onlinePeople: z.array(z.object({ id: z.uuid(), displayName: z.string(), avatarUrl: z.string().nullable() })), capabilities: z.object({ humanRooms: z.boolean() }) })); }
    async seedDemoSessions(): Promise<never> { throw new Error("Use the development preview for sample history"); }
}
