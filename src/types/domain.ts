import type { MusicTrackSlug } from "@/lib/audio/catalog";

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
};

export type DayStat = { date: string; totalSeconds: number; sessionCount: number };
export type WebcamCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type Profile = {
  displayName: string;
  selectedTheme: string;
  timezone: string;
  showStreak: boolean;
  reduceMotion: boolean;
  webcamEnabled: boolean;
  webcamCorner: WebcamCorner;
  ambienceEnabled: boolean;
  musicTrack: MusicTrackSlug | null;
  musicVolume: number;
  roomVolume: number;
  comebackShownForDate: string | null;
};
