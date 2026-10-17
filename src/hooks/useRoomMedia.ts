"use client";
import { useEffect, useState } from "react";
import { LiveKitMediaRoomAdapter } from "@/lib/community/mediaAdapter";
import { requestRoomToken } from "@/lib/community/roomMedia";
import type { Room, Track } from "livekit-client";
// Deliberately separate from useLocalCamera: this stream is explicitly shared.
export function useRoomMedia(id: string, joined: boolean, publish: boolean) {
    const [room, setRoom] = useState<Room | null>(null);
    const [tracks, setTracks] = useState<Map<string, Track>>(new Map());
    const [unavailable, setUnavailable] = useState(false);
    useEffect(() => {
        if (!joined)
            return;
        let cancelled = false;
        let connection: Room | undefined;
        let adapter:LiveKitMediaRoomAdapter|undefined;
        let unsubscribe:(()=>void)|undefined;
        const refresh = () => {
            if (!connection || cancelled)
                return;
            setTracks(adapter?.tracks()??new Map());
        };
        void (async () => {
            try {
                const [{ Room, RoomEvent }, credentials] = await Promise.all([import("livekit-client"), requestRoomToken(id, publish)]);
                if (cancelled)
                    return;
                connection = new Room({ adaptiveStream: true, dynacast: true, videoCaptureDefaults: { resolution: { width: 320, height: 240 } } });
                adapter=new LiveKitMediaRoomAdapter(connection);
                unsubscribe=adapter.subscribe(refresh);
                connection.on(RoomEvent.Disconnected, () => { if (!cancelled) {
                    setTracks(new Map());
                    setUnavailable(true);
                } });
                await adapter.connect(credentials.url, credentials.token);
                if (cancelled) {
                    await connection.disconnect();
                    return;
                }
                if (publish)
                    await adapter.publish();
                if (cancelled) {
                    await connection.disconnect();
                    return;
                }
                setRoom(connection);
                setUnavailable(false);
                refresh();
            }
            catch {
                if (!cancelled)
                    setUnavailable(true);
            }
        })();
        return () => { cancelled = true; unsubscribe?.(); setRoom(null); setTracks(new Map()); void connection?.disconnect(); };
    }, [id, joined, publish]);
    return { room, tracks, unavailable };
}
