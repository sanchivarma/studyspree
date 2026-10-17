import type { MusicTrackSlug } from "@/lib/audio/catalog";
import type { EffectSlug, EffectVolumes } from "@/lib/audio/effects";
import type { CompanionPreferences } from "./characters";

export type EndedReason = "completed" | "stopped_early" | "abandoned";

export type Session = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  plannedMinutes: number | null;
  actualSeconds: number;
  endedReason: EndedReason | null;
  themeSlug: string;
  localDate: string;
  task: string | null;
  companions: CompanionPreferences;
  roomId?: string | null;
  title?:string;
  rules?:string|null;
  visibility?:'public'|'private';
};

export type DayStat = { date: string; totalSeconds: number; sessionCount: number };
export type WebcamCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type Profile = {
  mirrorSelfView: boolean;
  showOwnTile: boolean;
  shareNowPlaying: boolean;
  leaderboardOptIn: boolean;
  displayName: string;
  selectedTheme: string;
  timezone: string;
  showStreak: boolean;
  reduceMotion: boolean;
  webcamEnabled: boolean;
  webcamCorner: WebcamCorner;
  ambienceEnabled: boolean;
  musicTrack: MusicTrackSlug | `radio:${string}` | null;
  backgroundEffects?: EffectSlug[];
  effectVolumes?: EffectVolumes;
  musicVolume: number;
  roomVolume: number;
  comebackShownForDate: string | null;
  companionPreferences: CompanionPreferences;
};
