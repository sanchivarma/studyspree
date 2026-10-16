import { ZodError } from "zod";
import { invitationRequestSchema } from "@/lib/invitations/schemas";
import { sendInvitation, InvitationServerError } from "@/lib/invitations/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "unauthorized" }, { status: 403, headers });
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) throw new SyntaxError();
    const text = await request.text();
    if (text.length > 4096) throw new SyntaxError();
    return Response.json(await sendInvitation(invitationRequestSchema.parse(JSON.parse(text))), { headers });
  } catch (error) {
    const invalid = error instanceof SyntaxError || error instanceof ZodError;
    return Response.json({ error: error instanceof InvitationServerError ? error.code : invalid ? "invalid" : "unavailable" }, { status: error instanceof InvitationServerError ? error.status : invalid ? 400 : 503, headers });
  }
}
