import { createAuthClient } from "@/lib/auth/server";
import { sessionNoteRequestSchema, sessionNoteSchema, sessionNotesPageSchema } from "@/lib/sessionNotes/schemas";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "unavailable" }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "invalid" }, { status: 400, headers });
  try {
    const text = await request.text();
    if (text.length > 16384) return Response.json({ error: "invalid" }, { status: 400, headers });
    const input = sessionNoteRequestSchema.safeParse(JSON.parse(text));
    if (!input.success) return Response.json({ error: "invalid" }, { status: 400, headers });
    const client = await createAuthClient();
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user) return Response.json({ error: "unavailable" }, { status: 401, headers });
    const value = input.data;
    const result = value.operation === "add"
      ? await client.rpc("add_session_note", { p_session: value.sessionId, p_body: value.body, p_client: value.clientId })
      : await client.rpc("read_session_notes", { p_session: value.sessionId, ...(value.cursor ? { p_after_at: value.cursor.at, p_after_id: value.cursor.id } : {}) });
    if (result.error) return Response.json({ error: "unavailable" }, { status: result.error.code === "42501" ? 403 : result.error.code === "22023" ? 400 : result.error.code === "54000" ? 429 : 503, headers });
    return Response.json((value.operation === "add" ? sessionNoteSchema : sessionNotesPageSchema).parse(result.data), { headers });
  } catch (error) {
    return Response.json({ error: "unavailable" }, { status: error instanceof SyntaxError ? 400 : 503, headers });
  }
}
