import { z } from "zod";

export const spotifyStateSchema = z.object({
  provider: z.literal("spotify"), available: z.boolean(), connected: z.boolean(),
  reason: z.enum(["notConfigured", "disconnected", "connected"]),
}).strict().refine(state => !state.connected || (state.available && state.reason === "connected"));
export type SpotifyState = z.infer<typeof spotifyStateSchema>;
export type NowPlaying = { title: string; artist: string; url: string };
export const unavailableSpotify: SpotifyState = { provider: "spotify", available: false, connected: false, reason: "notConfigured" };
