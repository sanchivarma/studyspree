import { ZodError } from "zod";
import { communityRequestSchema } from "@/lib/community/schemas";
import { executeCommunity, CommunityServerError } from "@/lib/community/server";
import { hasClientDuration } from "@/lib/repo/requestValidation";
// This endpoint never accepts a duration from the client and must never
// be changed to do so. Duration is computed by a database trigger.
export async function POST(request: Request) {
    const headers = { "Cache-Control": "private, no-store" };
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
        return Response.json({ error: "forbidden" }, { status: 403, headers });
    try {
        if (!request.headers.get("content-type")?.includes("application/json"))
            throw new SyntaxError();
        const body = await request.text();
        if (body.length > 32768)
            throw new SyntaxError();
        const raw: unknown = JSON.parse(body);
        if (hasClientDuration(raw))
            throw new SyntaxError();
        return Response.json(await executeCommunity(communityRequestSchema.parse(raw)), { headers });
    }
    catch (error) {
        return Response.json({ error: error instanceof CommunityServerError ? error.code : error instanceof ZodError || error instanceof SyntaxError ? "invalid" : "unavailable" }, { status: error instanceof CommunityServerError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503, headers });
    }
}
