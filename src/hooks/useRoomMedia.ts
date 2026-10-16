"use client";
import { useEffect, useState } from "react";
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
        const refresh = () => {
            if (!connection || cancelled)
                return;
            const next = new Map<string, Track>();
            for (const participant of [connection.localParticipant, ...connection.remoteParticipants.values()]) {
                for (const publication of participant.videoTrackPublications.values())
                    if (publication.track && !publication.isMuted)
                        next.set(participant.identity, publication.track);
            }
            setTracks(next);
        };
        void (async () => {
            try {
                const [{ Room, RoomEvent }, credentials] = await Promise.all([import("livekit-client"), requestRoomToken(id, publish)]);
                if (cancelled)
                    return;
                connection = new Room({ adaptiveStream: true, dynacast: true, videoCaptureDefaults: { resolution: { width: 320, height: 240 } } });
                for (const event of [RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.ParticipantDisconnected])
                    connection.on(event, refresh);
                connection.on(RoomEvent.Disconnected, () => { if (!cancelled) {
                    setTracks(new Map());
                    setUnavailable(true);
                } });
                await connection.connect(credentials.url, credentials.token);
                if (cancelled) {
                    await connection.disconnect();
                    return;
                }
                if (publish)
                    await connection.localParticipant.setCameraEnabled(true);
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
        return () => { cancelled = true; setRoom(null); setTracks(new Map()); void connection?.disconnect(); };
    }, [id, joined, publish]);
    return { room, tracks, unavailable };
}
