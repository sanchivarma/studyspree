import { randomUUID } from "node:crypto";
import { createAuthClient } from "@/lib/auth/server";
import { attachmentSchema } from "@/lib/community/schemas";
import { boundedMultipart, mediaExtension } from "@/lib/community/media";
// This endpoint never accepts a duration from the client and must never
// be changed to do so. Duration is computed by a database trigger.
export async function POST(request: Request) {
    const headers = { "Cache-Control": "private, no-store" };
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
        return Response.json({ error: "forbidden" }, { status: 403, headers });
    const client = await createAuthClient();
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user)
        return Response.json({ error: "accountRequired" }, { status: 401, headers });
    try {
        const form = await boundedMultipart(request);
        if ([...form.keys()].some(key => key !== "file") || form.getAll("file").length !== 1)
            throw new Error("Invalid fields");
        const file = form.get("file");
        if (!(file instanceof File) || file.size > 10485760)
            throw new Error("Invalid file");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const extension = mediaExtension(bytes, file.type);
        const path = `${identity.data.user.id}/${randomUUID()}.${extension}`;
        const attachment = attachmentSchema.parse({ path, mime: file.type, size: file.size, name: file.name.replace(/[\u0000-\u001f]/g, "").slice(0, 100) || "attachment" });
        const response = await client.storage.from("community-media").upload(path, bytes, { contentType: file.type, upsert: false });
        if (response.error)
            return Response.json({ error: "unavailable" }, { status: 503, headers });
        return Response.json(attachment, { headers });
    }
    catch {
        return Response.json({ error: "invalidMedia" }, { status: 400, headers });
    }
}
