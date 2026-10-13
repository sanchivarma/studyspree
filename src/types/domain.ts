export type EndedReason = "completed" | "stopped_early" | "abandoned";

export type Session = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  plannedMinutes: number | null;
  actualSeconds: number;
  endedReason: EndedReason | null;
  characterSlug: string;
  localDate: string;
  task: string | null;
};

export type DayStat = { date: string; totalSeconds: number; sessionCount: number };
export type Profile = {
  displayName: string;
  selectedCharacter: string;
  timezone: string;
  showStreak: boolean;
  reduceMotion: boolean;
  webcamEnabled: boolean;
  ambienceEnabled: boolean;
};
