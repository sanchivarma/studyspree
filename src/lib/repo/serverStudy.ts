import "server-only";
import { z } from "zod";
import { createAuthClient } from "@/lib/auth/server";
import type { Database } from "@/types/database";
import { profileSchema, sessionSchema } from "./local";
import { repositoryRequestSchema, summarySchema } from "./remoteSchemas";
import { companionSchema, soloCompanions } from "@/lib/characters/schemas";
import { tileSchema } from "@/lib/personalTile/schemas";
import { profileEditSchema } from "@/lib/profiles/schemas";
import { serverProfileRepository } from "@/lib/profiles/serverRepository";
import { now } from "@/lib/clock";
type Client = Awaited<ReturnType<typeof createAuthClient>>;
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type Input = z.infer<typeof repositoryRequestSchema>;
export class StudyError extends Error {
    constructor(public status: number) { super("Study operation unavailable"); }
}
function assertResult(error: unknown) { if (error)
    throw new StudyError(503); }
export function mapSession(row: SessionRow) {
    return sessionSchema.parse({ id: row.id, startedAt: new Date(row.started_at).toISOString(), endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
        companionStatusCycle: row.companion_status_cycle, plannedMinutes: row.planned_minutes, actualSeconds: row.actual_seconds, endedReason: row.ended_reason, themeSlug: row.theme_slug, localDate: row.local_date, task: row.task, companions: companionSchema.parse(row.companions), roomId: row.room_id,title:row.title,rules:row.rules,visibility:row.visibility });
}
async function profile(client: Client, id: string) {
    const response = await client.from("profiles").select("*").eq("id", id).single();
    assertResult(response.error);
    const p = response.data!;
    const tile=tileSchema.parse(p.personal_tile);
    return profileSchema.parse({ displayName: p.display_name, selectedTheme: p.selected_theme, timezone: p.timezone, showStreak: p.show_streak,
        mirrorSelfView:tile.mirrored,showOwnTile:tile.isVisible,shareNowPlaying:tile.shareNowPlaying,leaderboardOptIn:p.leaderboard_opt_in,
        reduceMotion: p.reduce_motion, webcamEnabled: p.webcam_enabled, webcamCorner: p.webcam_corner, ambienceEnabled: p.ambience_enabled,
        musicTrack: p.music_track, backgroundEffects: p.background_effects, effectVolumes: p.effect_volumes, musicVolume: p.music_volume, roomVolume: p.room_volume, comebackShownForDate: p.comeback_shown_for_date,
        companionPreferences: p.companion_preferences });
}
async function streak(client: Client, id: string) {
    const response = await client.from("streaks").select("*").eq("user_id", id).single();
    assertResult(response.error);
    const s = response.data!;
    return { current: s.current_streak, best: s.best_streak, lastActiveDate: s.last_active_date, freezesRemaining: s.freezes_remaining, freezesResetAt: s.freezes_reset_at };
}
async function summary(client: Client) { const response = await client.rpc("study_summary"); assertResult(response.error); return summarySchema.parse(response.data); }
export async function executeStudy(input: Input) {
    const client = await createAuthClient();
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user)
        throw new StudyError(401);
    const id = identity.data.user.id;
    switch (input.op) {
        case "profile": return profile(client, id);
        case "updateProfile": {
            const p = input.patch;
            const mapping = { displayName: "display_name", selectedTheme: "selected_theme", timezone: "timezone", showStreak: "show_streak", reduceMotion: "reduce_motion", webcamEnabled: "webcam_enabled", webcamCorner: "webcam_corner", ambienceEnabled: "ambience_enabled", musicTrack: "music_track", musicVolume: "music_volume", roomVolume: "room_volume", comebackShownForDate: "comeback_shown_for_date", companionPreferences: "companion_preferences" } as const;
            const update: Database["public"]["Tables"]["profiles"]["Update"] = {};
            if (p.backgroundEffects !== undefined) update.background_effects = profileSchema.shape.backgroundEffects.parse(p.backgroundEffects);
            if (p.effectVolumes !== undefined) update.effect_volumes = profileSchema.shape.effectVolumes.parse(p.effectVolumes);
            for (const [key, value] of Object.entries(p))
                if(key in mapping)Reflect.set(update, mapping[key as keyof typeof mapping], value);
            if(typeof p.leaderboardOptIn === "boolean")update.leaderboard_opt_in=p.leaderboardOptIn;
            if(p.mirrorSelfView!==undefined||p.showOwnTile!==undefined||p.shareNowPlaying!==undefined){const patch={...(p.mirrorSelfView!==undefined?{mirrored:p.mirrorSelfView}:{}),...(p.showOwnTile!==undefined?{isVisible:p.showOwnTile}:{}),...(p.shareNowPlaying!==undefined?{shareNowPlaying:p.shareNowPlaying}:{})};const tile=await client.rpc('update_personal_tile',{p_patch:patch});assertResult(tile.error);}
            const response = Object.keys(update).length ? await client.from("profiles").update(update).eq("id", id).select("id").single() : {error:null};
            assertResult(response.error);
            return profile(client, id);
        }
        case "directory": return serverProfileRepository.getOwn();
        case "updateDirectory": return serverProfileRepository.update(profileEditSchema.parse(input.input));
        case "earnedAchievements": {
            const response = await client.from("user_achievements").select("achievement_id,earned_at").eq("user_id", id);
            assertResult(response.error);
            return response.data!.map(a => ({ achievementId: a.achievement_id, earnedAt: a.earned_at }));
        }
        case "characterHistory": {
            const response = await client.rpc("read_character_history"); assertResult(response.error); return response.data;
        }
        case "tileHistory": {
            const response = await client.rpc("read_tile_history", { p_cursor: input.cursor ?? undefined, p_limit: input.limit }); assertResult(response.error); return response.data;
        }
        case "awards": {
            const response = await client.from("achievement_awards").select("milestone,earned_at").eq("user_id", id).order("milestone");
            assertResult(response.error);
            return response.data!.map(a => ({ milestone: a.milestone, earnedAt: a.earned_at }));
        }
        case "tile":
        case "updateTile": {
            const response = await client.from("profiles").select("personal_tile").eq("id", id).single();
            assertResult(response.error);
            const current = tileSchema.parse(response.data!.personal_tile);
            if (input.op === "tile")
                return current;
            const saved = await client.rpc("update_personal_tile", { p_patch: input.patch });
            assertResult(saved.error);
            return tileSchema.parse(saved.data);
        }
        case "active": {
            const response = await client.from("sessions").select("*").eq("user_id", id).is("ended_at", null).maybeSingle();
            assertResult(response.error);
            return response.data ? mapSession(response.data) : null;
        }
        case "session": {
            const response = await client.from("sessions").select("*").eq("user_id", id).eq("id", input.id).maybeSingle();
            assertResult(response.error);
            return response.data ? mapSession(response.data) : null;
        }
        case "start": {
            const p = input.input;
            const response = p.title !== undefined ? await client.rpc("start_session_with_details",{p_minutes:p.plannedMinutes!,p_theme:p.themeSlug,p_task:p.task!,p_companions:p.companions??soloCompanions(),p_title:p.title,p_rules:p.rules!,p_visibility:p.visibility,p_room:p.roomId??undefined}) : input.input.roomId ? await client.rpc("start_room_session", { p_room: input.input.roomId, p_minutes: input.input.plannedMinutes!, p_theme: input.input.themeSlug, p_task: input.input.task!, p_companions: input.input.companions ?? soloCompanions() }) : await client.rpc("start_study_session", { p_minutes: p.plannedMinutes!, p_theme: p.themeSlug, p_task: p.task!, p_companions: p.companions ?? soloCompanions() });
            assertResult(response.error);
            return mapSession(response.data!);
        }
        case "finish": {
            const previous = await client.from("sessions").select("*").eq("id", input.id).eq("user_id", id).maybeSingle();
            assertResult(previous.error);
            if (input.reason === "abandoned" && !previous.data?.ended_at)
                throw new StudyError(400);
            const response = previous.data?.ended_at ? { data: previous.data, error: null } : await client.rpc("finish_study_session", { p_id: input.id, p_reason: input.reason });
            assertResult(response.error);
            const row = response.data!;
            const [totals, activity, days] = await Promise.all([summary(client), streak(client, id), client.from("day_stats").select("total_seconds").eq("user_id", id).eq("local_date", row.local_date).maybeSingle()]);
            assertResult(days.error);
            return { session: mapSession(row), totalSecondsAllTime: totals.totalSeconds, dayTotalSeconds: days.data?.total_seconds ?? 0,
                streak: { current: activity.current, best: activity.best, changed: row.streak_changed, freezeUsed: row.freeze_used } };
        }
        case "heartbeat": {
            const response = await client.from("sessions").update({ last_heartbeat_at: now().toISOString() }).eq("id", input.id).eq("user_id", id).is("ended_at", null).select("id").maybeSingle();
            assertResult(response.error);
            return null;
        }
        case "companions": {
            const response = await client.from("sessions").update({ companions: input.companions }).eq("id", input.id).eq("user_id", id).is("ended_at", null).select("*").single();
            assertResult(response.error);
            return mapSession(response.data!);
        }
        case "sessions": {
            if (input.limit === 0)
                return [];
            const response = await client.from("sessions").select("*").eq("user_id", id).order("started_at", { ascending: false }).order("id", { ascending: false }).range(input.offset, input.offset + input.limit - 1);
            assertResult(response.error);
            return response.data!.map(mapSession);
        }
        case "history": {
            const features = await client.rpc("read_entitlements"); assertResult(features.error);
            if (!z.array(z.object({key:z.string(),enabled:z.boolean()})).parse(features.data).find(f=>f.key==='detailed-history')?.enabled) throw new StudyError(403);
            const q = input.query;
            const signature = JSON.stringify([q.from ?? null, q.to ?? null, q.companionMode ?? null]);
            let cursor: {
                startedAt: string;
                id: string;
                filters: string;
            } | undefined;
            if (q.cursor) {
                try {
                    cursor = z.object({ startedAt: z.iso.datetime(), id: z.uuid(), filters: z.string() }).strict().parse(JSON.parse(decodeURIComponent(q.cursor)));
                }
                catch {
                    throw new StudyError(400);
                }
                if (cursor.filters !== signature)
                    throw new StudyError(400);
            }
            let request = client.from("sessions").select("*").eq("user_id", id).not("ended_at", "is", null);
            if (q.from)
                request = request.gte("local_date", q.from);
            if (q.to)
                request = request.lte("local_date", q.to);
            if (q.companionMode)
                request = request.eq("companions->>mode", q.companionMode);
            if (cursor)
                request = request.or(`started_at.lt.${cursor.startedAt},and(started_at.eq.${cursor.startedAt},id.lt.${cursor.id})`);
            const response = await request.order("started_at", { ascending: false }).order("id", { ascending: false }).limit(q.limit + 1);
            assertResult(response.error);
            const items = response.data!.slice(0, q.limit).map(mapSession);
            const last = items.at(-1);
            return { items, nextCursor: response.data!.length > q.limit && last ? encodeURIComponent(JSON.stringify({ startedAt: last.startedAt, id: last.id, filters: signature })) : null };
        }
        case "days": {
            if (input.from > input.to)
                throw new StudyError(400);
            const response = await client.rpc("study_days", { p_from: input.from, p_to: input.to });
            assertResult(response.error);
            return response.data;
        }
        case "summary": return summary(client);
        case "total": return (await summary(client)).totalSeconds;
        case "streak": return streak(client, id);
        case "dashboard": {
            const response=await client.rpc("community_dashboard");assertResult(response.error);return response.data;
        }
    }
}
