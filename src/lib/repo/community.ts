import { communityStateSchema, mutationResultSchema, attachmentSchema, type CommunityArea, type CommunityQuery, type CommunityCommand, type CommunityState } from "@/lib/community/schemas";
import { z } from "zod";
export class CommunityError extends Error {
    constructor(public code: string) { super(code); }
}
async function send<T>(path: string, body: BodyInit, schema: z.ZodType<T>, json = true): Promise<T> {
    const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: json ? { "Content-Type": "application/json" } : undefined, body, cache: "no-store" });
    if (response.status === 401)
        throw new CommunityError("accountRequired");
    if (!response.ok) {
        let code = "unavailable";
        try {
            code = z.object({ error: z.string() }).parse(await response.json()).error;
        }
        catch { }
        throw new CommunityError(code);
    }
    return schema.parse(await response.json());
}
export const communityRepository = {
    async read(area: CommunityArea, query: CommunityQuery = {}): Promise<CommunityState> { return send("/api/community", JSON.stringify({ operation: "read", area, query }), communityStateSchema); },
    async mutate(command: CommunityCommand) { return send("/api/community", JSON.stringify({ operation: "mutate", command }), mutationResultSchema); },
    async upload(file: File) { const data = new FormData(); data.set("file", file); return send("/api/community-media", data, attachmentSchema, false); },
};
