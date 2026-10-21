import { z } from "zod";
import { soloSceneSchema, defaultSoloScene } from "@/lib/soloScenes/catalog";
import { musicTracks } from "@/lib/audio/catalog";
import { effectSlugs, removeRetiredEffects, removeRetiredEffectVolumes } from "@/lib/audio/effects";
import { companionSchema, localCompanionSchema, soloCompanions } from "@/lib/characters/schemas";
import { sessionDetailsShape } from "@/lib/session/setup";

const iso = z.iso.datetime();
const date = z.iso.date();
const timezone = z.string().refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
});
export const profileSchema = z.object({
  soloScene: soloSceneSchema.default(defaultSoloScene),
  mirrorSelfView:z.boolean().default(true),showOwnTile:z.boolean().default(true),shareNowPlaying:z.boolean().default(false),leaderboardOptIn:z.boolean().default(false),
  displayName: z.string(), selectedTheme: z.string().min(1), timezone,
  showStreak: z.boolean(), reduceMotion: z.boolean(), webcamEnabled: z.boolean(), ambienceEnabled: z.boolean(),
  // Older profiles upgrade without discarding preferences.
  comebackShownForDate: date.nullable().default(null),
  webcamCorner: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("bottom-right"),
  musicTrack: z.union([z.enum(musicTracks.map(track => track.slug)), z.templateLiteral(["radio:", z.string().regex(/^[a-z0-9-]{1,80}$/)])]).nullable().default(null),
  backgroundEffects: z.preprocess(removeRetiredEffects, z.array(z.enum(effectSlugs)).max(effectSlugs.length).refine(value => new Set(value).size === value.length).default([])),
  effectVolumes: z.preprocess(removeRetiredEffectVolumes, z.partialRecord(z.enum(effectSlugs), z.number().min(0).max(1)).default({})),
  musicVolume: z.number().min(0).max(1).default(0),
  roomVolume: z.number().min(0).max(1).default(0),
  companionPreferences: localCompanionSchema.default(soloCompanions),
}).strict();
export const localSessionInputSchema = z.object({ ...sessionDetailsShape,plannedMinutes: z.number().finite().positive().nullable(), themeSlug: z.string().min(1), task: z.string().nullable(), companions: localCompanionSchema.default(soloCompanions) }).strict();
export const sessionSchema = z.object({
  id: z.string().min(1), startedAt: iso, endedAt: iso.nullable(),
  companionStatusCycle: z.number().int().nonnegative().optional(),
  roomId: z.uuid().nullable().optional(),
  ...localSessionInputSchema.shape, companions: companionSchema.default(soloCompanions), actualSeconds: z.number().int().min(0).max(21600),
  endedReason: z.enum(["completed", "stopped_early", "abandoned"]).nullable(), localDate: date,
}).strict().refine((session) => session.endedAt === null
  ? session.endedReason === null && session.actualSeconds === 0
  : session.endedReason !== null && session.endedAt >= session.startedAt);
export const streakSchema = z.object({
  current: z.number().int().nonnegative(), best: z.number().int().nonnegative(),
  lastActiveDate: date.nullable(), freezesRemaining: z.number().int().min(0).max(2), freezesResetAt: date,
}).strict().refine((state) => state.best >= state.current);
