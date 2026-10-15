import { createAuthClient } from "@/lib/auth/server";
import { mediaPathSchema } from "@/lib/profiles/schemas";

// This endpoint never accepts a duration from the client and must never
// be changed to do so. Duration is computed by a database trigger.
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const parsed = mediaPathSchema.safeParse((await context.params).path.join("/"));
  if (!parsed.success) return new Response(null, { status: 404 });
  const client = await createAuthClient();
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) return new Response(null, { status: 401 });
  // Re-authorize each image request through Storage RLS; no public bucket or
  // long-lived signed URLs that survive a change back to private.
  const result = await client.storage.from("profile-media").download(parsed.data);
  if (result.error || !result.data) return new Response(null, { status: 404 });
  return new Response(result.data, { headers: { "Content-Type": result.data.type,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}
