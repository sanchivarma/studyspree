import "server-only";
import { unavailableSpotify, type NowPlaying, type SpotifyState } from "@/types/musicIntegration";
import { CapabilityError } from "@/lib/repo/capabilities";

/** OAuth credentials/tokens and provider calls belong behind this server boundary. */
export type SpotifyAdapter = {
  getState(userId: string): Promise<SpotifyState>;
  getNowPlaying(userId: string): Promise<NowPlaying | null>;
};

// A configured OAuth implementation can replace this adapter later. Merely adding
// environment variables must never make the UI claim an account is connected.
export const spotifyAdapter: SpotifyAdapter = {
  async getState() { return { ...unavailableSpotify }; },
  async getNowPlaying() { throw new CapabilityError("spotifyNowPlaying"); },
};
