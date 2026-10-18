"use client";
import { useEffect, useRef, useState } from "react";
import { ambience } from "@/lib/audio/ambience";
import { useUpdateRoomControls } from "./useUpdateRoomControls";
import type { RoomAudio, RoomControls } from "@/lib/community/roomControls";

export function useRoomAudio(id: string, controls: RoomControls, isCreator: boolean, locked: boolean) {
  const mutation = useUpdateRoomControls(id);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState<RoomAudio | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ controls, draft }); latest.current = { controls, draft };
  const audio = draft ?? controls.audio;
  useEffect(() => {
    ambience.setMusicTrack(locked ? null : audio.musicTrack);
    ambience.setBackgroundEffects(locked ? [] : audio.backgroundEffects, audio.effectVolumes);
    ambience.setMusicVolume(listening && !locked ? audio.musicVolume : 0);
    ambience.setRoomVolume(listening && !locked ? audio.roomVolume : 0);
  }, [audio, listening, locked]);
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); ambience.destroy(); }, []);
  const update = (patch: Partial<RoomAudio>) => {
    if (!isCreator || locked) return;
    const next = { ...audio, ...patch }; setDraft(next); setListening(true);
    // Unlock on this gesture, not a later async save/refetch.
    ambience.setMusicTrack(next.musicTrack); ambience.setBackgroundEffects(next.backgroundEffects, next.effectVolumes);
    ambience.setMusicVolume(next.musicVolume); ambience.setRoomVolume(next.roomVolume); ambience.init();
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      mutation.mutate({ ...latest.current.controls, audio: next }, { onSuccess: () => setDraft(null), onError: () => setDraft(null) });
    }, 500);
  };
  const toggleListening = () => {
    const enabled = !listening && !locked;
    ambience.setMusicTrack(audio.musicTrack); ambience.setBackgroundEffects(audio.backgroundEffects, audio.effectVolumes);
    ambience.setMusicVolume(enabled ? audio.musicVolume : 0); ambience.setRoomVolume(enabled ? audio.roomVolume : 0);
    ambience.init(); setListening(enabled);
  };
  return { audio, update, listening, toggleListening, isError: mutation.isError };
}
