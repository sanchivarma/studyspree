import { spotifyStateSchema } from "@/types/musicIntegration";
import { CommunityError } from "./community";

export const musicIntegrationRepository = {
  async getSpotifyState() {
    const response = await fetch("/api/integrations/spotify", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new CommunityError(response.status === 401 ? "accountRequired" : "unavailable");
    return spotifyStateSchema.parse(await response.json());
  },
};
