"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { ambience } from "@/lib/audio/ambience";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile } from "@/types/domain";

type Preferences = Pick<Profile, "musicTrack" | "musicVolume" | "roomVolume">;
const defaults: Preferences = { musicTrack: null, musicVolume: 0, roomVolume: 0 };

export function useAmbience(character: string) {
  const profile = useProfile();
  const client = useQueryClient();
  const [changes, setChanges] = useState<Partial<Preferences>>({});
  const [unlocked, setUnlocked] = useState(false);
  const pending = useRef<Preferences | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const preferences: Preferences = {
    musicTrack: changes.musicTrack !== undefined ? changes.musicTrack : profile.data?.musicTrack ?? defaults.musicTrack,
    musicVolume: changes.musicVolume ?? profile.data?.musicVolume ?? 0,
    roomVolume: changes.roomVolume ?? profile.data?.roomVolume ?? 0,
  };
  const enabled = Object.keys(changes).length > 0
    ? preferences.roomVolume > 0 || (preferences.musicTrack !== null && preferences.musicVolume > 0)
    : profile.data?.ambienceEnabled ?? false;
  const save = useCallback(() => {
    const value = pending.current; pending.current = null;
    if (!value) return;
    writes.current = writes.current.catch(() => {}).then(async () => {
      const updated = await repo.updateProfile({ ...value, ambienceEnabled: value.roomVolume > 0 || (value.musicTrack !== null && value.musicVolume > 0) });
      client.setQueryData<Profile>(queryKeys.profile(), current => current ? {
        ...current, musicTrack: updated.musicTrack, musicVolume: updated.musicVolume,
        roomVolume: updated.roomVolume, ambienceEnabled: updated.ambienceEnabled,
      } : updated);
    }).catch(() => { /* Preferences must never block a session. */ });
  }, [client]);
  const update = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    // Configure and unlock within the input gesture, including mobile browsers
    // that require resume() to run before the event handler returns.
    ambience.setMusicTrack(next.musicTrack);
    ambience.setRoomForCharacter(character);
    ambience.setMusicVolume(next.musicVolume);
    ambience.setRoomVolume(next.roomVolume);
    ambience.init(); setUnlocked(true);
    setChanges(next); pending.current = next;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(save, 500);
  };
  useEffect(() => {
    ambience.setMusicTrack(preferences.musicTrack);
    ambience.setRoomForCharacter(character);
    ambience.setMusicVolume(enabled ? preferences.musicVolume : 0);
    ambience.setRoomVolume(enabled ? preferences.roomVolume : 0);
  }, [character, preferences.musicTrack, preferences.musicVolume, preferences.roomVolume, enabled]);
  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
    save(); ambience.destroy();
  }, [save]);
  return {
    ...preferences, isAudible: unlocked && enabled && (preferences.roomVolume > 0 || (preferences.musicTrack !== null && preferences.musicVolume > 0)),
    unlock: () => { ambience.init(); setUnlocked(true); },
    setMusicVolume: (musicVolume: number) => update({ musicVolume }),
    setRoomVolume: (roomVolume: number) => update({ roomVolume }),
    setMusicTrack: (musicTrack: Preferences["musicTrack"]) => update({ musicTrack, musicVolume: musicTrack && preferences.musicVolume === 0 ? 0.3 : preferences.musicVolume }),
  };
}
