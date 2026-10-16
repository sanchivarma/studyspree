import { createAuthClient } from "@/lib/auth/server";
// This endpoint never accepts a duration from the client and must never
// be changed to do so. Duration is computed by a database trigger.
export async function GET(_request: Request, { params }: {
    params: Promise<{
        path: string[];
    }>;
}) {
    const path = (await params).path.join("/");
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|gif|mp3|webm|ogg|pdf)$/.test(path))
        return new Response(null, { status: 404 });
    const client = await createAuthClient();
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user)
        return new Response(null, { status: 401 });
    const result = await client.storage.from("community-media").download(path);
    if (result.error || !result.data)
        return new Response(null, { status: 404 });
    const headers: Record<string, string> = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Type": result.data.type, "Content-Security-Policy": "default-src 'none'; sandbox" };
    if (result.data.type === "application/pdf")
        headers["Content-Disposition"] = 'attachment; filename="document.pdf"';
    return new Response(result.data, { headers });
}
