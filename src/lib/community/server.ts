import "server-only";
import { z } from "zod";
import { createAuthClient } from "@/lib/auth/server";
import { getDevAdminProfile } from "@/lib/auth/devAdmin";
import { communityRequestSchema, communityStateSchema } from "./schemas";
import { removeRoomParticipant } from "./livekitServer";
import { validateCommunityCursor } from "./cursor";
export class CommunityServerError extends Error {
    constructor(public status: number, public code: string) { super(code); }
}
export async function executeCommunity(input: z.infer<typeof communityRequestSchema>) {
    if (await getDevAdminProfile())
        throw new CommunityServerError(401, "accountRequired");
    const client = await createAuthClient();
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user)
        throw new CommunityServerError(401, "accountRequired");
    if (input.operation === "mutate") {
        if (input.command.action === "room.join" || input.command.action === "room.chat.send") {
            const command = input.command;
            const response = command.action === "room.join"
                ? await client.rpc("join_room_with_goal", { p_room: command.data.id, ...(command.data.goal === undefined ? {} : { p_goal: command.data.goal }) })
                : await client.rpc("send_room_chat", { p_room: command.data.id, p_body: command.data.body, p_client_id: command.data.clientId });
            if (response.error) throw new CommunityServerError(response.error.code === "42501" ? 403 : 400, response.error.code === "42501" ? "forbidden" : response.error.message.includes("rate limit") ? "chatLimit" : response.error.message.includes("is full") ? "full" : response.error.message.includes("allowance") ? "limit" : response.error.code === "22023" ? "invalid" : "unavailable");
            return response.data;
        }
        if (/^(contact\.|calendar\.|session\.share$)/.test(input.command.action)) {
            const response = await client.rpc("calendar_mutate", { p_action: input.command.action, p_data: input.command.data });
            if (response.error) throw new CommunityServerError(response.error.code === "42501" ? 403 : 400, response.error.code === "42501" ? "forbidden" : "invalid");
            return response.data;
        }
        if(input.command.action==="room.kick"){
            const response=await client.rpc("moderate_room",{p_room:input.command.data.id,p_target:input.command.data.targetId});
            if(response.error)throw new CommunityServerError(403,"forbidden");
            await removeRoomParticipant(input.command.data.id,input.command.data.targetId);return response.data;
        }
        const response = await client.rpc("community_mutate", { p_action: input.command.action, p_data: input.command.data });
        if (response.error) {
            const message = response.error.message;
            const code = message.includes("is full") ? "full" : message.includes("allowance") ? "limit" : message.includes("ownership") ? "transferFirst" : message.includes("Invitation") ? "inviteUnavailable" : response.error.code === "42501" ? "forbidden" : response.error.code === "22023" || response.error.code === "23514" ? "invalid" : "unavailable";
            throw new CommunityServerError(response.error.code === "42501" ? 403 : 400, code);
        }
        if (input.command.action === "room.leave" || (input.command.action === "room.share" && !input.command.data.value))
            await removeRoomParticipant(input.command.data.id, identity.data.user.id);
        return response.data;
    }
    const { area, query } = input;
    if (area === "roomParticipants") {
        if (!query.id) throw new CommunityServerError(400,"invalid");
        if (query.cursor) { try { z.object({snapshotAt:z.iso.datetime({offset:true}),id:z.uuid()}).strict().parse(JSON.parse(query.cursor)); } catch {throw new CommunityServerError(400,"invalid");} }
        const response=await client.rpc("read_room_participants",{p_room:query.id,p_cursor:query.cursor??undefined,p_limit:query.limit??20});
        if(response.error)throw new CommunityServerError(403,"forbidden");
        return communityStateSchema.parse(response.data);
    }
    if (area === "roomChat") {
        if (!query.id) throw new CommunityServerError(400, "invalid");
        const response = await client.rpc("read_room_chat", { p_room: query.id });
        if (response.error) throw new CommunityServerError(response.error.code === "42501" ? 403 : 400, "forbidden");
        return communityStateSchema.parse(response.data);
    }
    if (area === "calendar" || area === "contacts") {
        if (query.cursor && !/^\d{1,6}$/.test(query.cursor)) throw new CommunityServerError(400, "invalid");
        const response = await client.rpc("calendar_read", { p_area: area, p_query: query });
        if (response.error) throw new CommunityServerError(response.error.code === "42501" ? 403 : 400, "unavailable");
        return communityStateSchema.parse(response.data);
    }
    if (area === "recipients") {
        const response = await client.rpc("community_recipients", { p_term: query.q ?? "" });
        if (response.error)
            throw new CommunityServerError(400, "unavailable");
        return communityStateSchema.parse(response.data);
    }
    if (area === "leaderboards") {
        let cursor = null;
        if (query.cursor) {
            try {
                cursor = z.object({ snapshotAt: z.iso.datetime({ offset: true }), offset: z.number().int().min(0).max(100000) }).strict().parse(JSON.parse(query.cursor));
            }
            catch {
                throw new CommunityServerError(400, "invalid");
            }
        }
        const response = await client.rpc("community_leaderboard", { p_metric: query.metric ?? "time", p_period: query.period ?? "week", p_cursor: cursor! });
        if (response.error)
            throw new CommunityServerError(400, "unavailable");
        return communityStateSchema.parse(response.data);
    }
    if (query.cursor) { try { validateCommunityCursor(query.cursor); } catch { throw new CommunityServerError(400, "invalid"); } }
    const response = await client.rpc("community_read", { p_area: area, p_query: query });
    if (response.error)
        throw new CommunityServerError(response.error.code === "42501" ? 403 : 400, response.error.code === "42501" ? "forbidden" : "unavailable");
    return communityStateSchema.parse(response.data);
}
