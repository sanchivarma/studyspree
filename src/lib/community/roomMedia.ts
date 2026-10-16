import { z } from "zod";
export const roomTokenRequest = z.object({ id: z.uuid(), publish: z.boolean() }).strict();
export const roomTokenResponse = z.object({ url: z.url(), token: z.string().min(1) });
export async function requestRoomToken(id: string, publish: boolean) {
    const response = await fetch("/api/rooms/token", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, publish }), cache: "no-store" });
    if (!response.ok)
        throw new Error("Room media unavailable");
    return roomTokenResponse.parse(await response.json());
}
