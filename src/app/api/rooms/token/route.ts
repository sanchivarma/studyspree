import { AccessToken, TrackSource } from "livekit-server-sdk";
import { roomTokenRequest } from "@/lib/community/roomMedia";
import { executeCommunity, CommunityServerError } from "@/lib/community/server";
import { z } from "zod";
export async function POST(request: Request) {
    const headers = { "Cache-Control": "private, no-store" };
    if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin)
        return Response.json({}, { status: 403, headers });
    try {
        const text = await request.text();
        if (text.length > 1024)
            return Response.json({}, { status: 400, headers });
        const { id, publish } = roomTokenRequest.parse(JSON.parse(text));
        const state = await executeCommunity({ operation: "read", area: "room", query: { id } });
        const room = z.object({ viewerId: z.uuid(), context: z.object({ joined: z.boolean(), quota:z.object({remainingSeconds:z.number().nullable()}).optional(),people: z.array(z.object({ person: z.object({ id: z.uuid() }).nullable(), sharing: z.boolean() })) }) }).parse(state);
        if(!room.context.joined||room.context.quota?.remainingSeconds===0)return Response.json({}, {status:403,headers});
        if (publish && !room.context.people.some(p => p.person?.id === room.viewerId && p.sharing))
            return Response.json({}, { status: 403, headers });
        const url = process.env.LIVEKIT_URL, key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET;
        if (!url || !key || !secret)
            return Response.json({}, { status: 503, headers });
        const token = new AccessToken(key, secret, { identity: room.viewerId, ttl: "5m" });
        token.addGrant({ room: `studyspree-${id}`, roomJoin: true, canSubscribe: true, canPublish: publish, canPublishData: false, canPublishSources: [TrackSource.CAMERA] });
        return Response.json({ url, token: await token.toJwt() }, { headers });
    }
    catch (error) {
        return Response.json({}, { status: error instanceof CommunityServerError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503, headers });
    }
}
