export const roomSounds = {
  "nature-day": "/audio/evening-outdoor-v1.webm",
  "nature-night": "/audio/evening-outdoor-v1.webm",
  "sci-fi": "/audio/keyboard-room-v1.webm",
  "space": "/audio/city-night-v1.webm",
  "rain-desk": "/audio/rain-v1.webm",
  "night-shift": "/audio/city-night-v1.webm",
  "balcony-dusk": "/audio/evening-outdoor-v1.webm",
  "dorm-bunk": "/audio/keyboard-room-v1.webm",
} as const;

// Keep the old silent selection valid; opt into the new original music explicitly.
export const musicTracks = [
  { slug: "still-water", src: "/audio/still-water-v1.webm", labelKey: "ambience.stillWater" },
  { slug: "silent", src: "/audio/rain.webm", labelKey: "ambience.silentTrack" },
] as const;
export type MusicTrackSlug = typeof musicTracks[number]["slug"];
