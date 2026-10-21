import { ZodError } from "zod";
import { repositoryRequestSchema } from "@/lib/repo/remoteSchemas";
import { hasClientDuration } from "@/lib/repo/requestValidation";
import { executeStudy, StudyError } from "@/lib/repo/serverStudy";
// This endpoint never accepts a duration from the client and must never
// be changed to do so. Duration is computed by a database trigger.
export async function POST(request: Request) {
    const headers = { "Cache-Control": "private, no-store" };
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
        return Response.json({ error: "unauthorized" }, { status: 403, headers });
    if (!request.headers.get("content-type")?.includes("application/json"))
        return Response.json({ error: "invalid" }, { status: 400, headers });
    try {
        const raw = await request.text();
        if (raw.length > 16384)
            return Response.json({ error: "invalid" }, { status: 400, headers });
        const value: unknown = JSON.parse(raw);
        if (hasClientDuration(value))
            return Response.json({ error: "invalid" }, { status: 400, headers });
        return Response.json(await executeStudy(repositoryRequestSchema.parse(value)), { headers });
    }
    catch (error) {
        return Response.json({ error: "unavailable" }, { status: error instanceof StudyError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503, headers });
    }
}
