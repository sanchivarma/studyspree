"use client";
import { useEffect, useRef } from "react";
import type { Track } from "livekit-client";
export function RoomVideo({ track, mirrored }: {
    track: Track;
    mirrored: boolean;
}) {
    const element = useRef<HTMLVideoElement>(null);
    useEffect(() => { const video = element.current; if (!video)
        return; track.attach(video); return () => { track.detach(video); }; }, [track]);
    return <video ref={element} autoPlay muted playsInline className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`}/>;
}
