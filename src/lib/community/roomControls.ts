import { z } from "zod";
import { themeSlugs } from "@/lib/themes/registry";
import { characterSlugs } from "@/types/characters";
import { effectSlugs } from "@/lib/audio/effects";
import { musicTracks } from "@/lib/audio/catalog";
import { radioStations } from "@/lib/audio/radio";

export const roomAudioSchema = z.object({
  musicTrack: z.string().nullable().refine(value => value === null || musicTracks.some(track => track.slug === value) || radioStations.some(station => `radio:${station.id}` === value)),
  musicVolume: z.number().min(0).max(1), roomVolume: z.number().min(0).max(1),
  backgroundEffects: z.array(z.enum(effectSlugs)).max(effectSlugs.length).refine(value => new Set(value).size === value.length),
  effectVolumes: z.partialRecord(z.enum(effectSlugs), z.number().min(0).max(1)),
}).strict();
export const roomControlsSchema = z.object({
  themeSlug: z.enum(themeSlugs),
  characterSlugs: z.array(z.enum(characterSlugs)).max(characterSlugs.length).refine(value => new Set(value).size === value.length),
  audio: roomAudioSchema,
}).strict();
export type RoomAudio = z.infer<typeof roomAudioSchema>;
export type RoomControls = z.infer<typeof roomControlsSchema>;
export const silentRoomAudio: RoomAudio = { musicTrack: null, musicVolume: 0, roomVolume: 0, backgroundEffects: [], effectVolumes: {} };
export const defaultRoomControls: RoomControls = { themeSlug: "rain-desk", characterSlugs: [], audio: silentRoomAudio };
