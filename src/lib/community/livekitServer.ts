import "server-only";
import { RoomServiceClient } from "livekit-server-sdk";
export function livekitService() {
    const url = process.env.LIVEKIT_URL, key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET;
    if (!url || !key || !secret)
        throw new Error("Room media not configured");
    return new RoomServiceClient(url.replace(/^ws/, "http"), key, secret,{requestTimeout:3,failover:false});
}
export async function removeRoomParticipant(roomId: string, userId: string) {
    try {
        await livekitService().removeParticipant(`studyspree-${roomId}`, userId);
    }
    catch { /* Already disconnected or media unavailable; timer accounting is independent. */ }
}
