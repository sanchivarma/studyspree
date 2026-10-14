export const roomSounds = {
  "rain-desk": "/audio/rain.webm",
  "night-shift": "/audio/city-night.webm",
  "balcony-dusk": "/audio/evening-outdoor.webm",
  "dorm-bunk": "/audio/keyboard-room.webm",
} as const;

// Replace/add tracks with licensed, versioned assets when real music is supplied.
export const musicTracks = [{ slug: "silent", src: "/audio/rain.webm", labelKey: "ambience.silentTrack" }] as const;
export type MusicTrackSlug = typeof musicTracks[number]["slug"];
