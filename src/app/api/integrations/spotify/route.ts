import { createAuthClient } from "@/lib/auth/server";
import { spotifyAdapter } from "@/lib/integrations/spotify";
import { spotifyStateSchema } from "@/types/musicIntegration";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const client = await createAuthClient();
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user) return Response.json({ error: "accountRequired" }, { status: 401, headers });
    return Response.json(spotifyStateSchema.parse(await spotifyAdapter.getState(identity.data.user.id)), { headers });
  } catch { return Response.json({ error: "unavailable" }, { status: 503, headers }); }
}
