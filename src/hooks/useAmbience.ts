"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { ambience } from "@/lib/audio/ambience";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { Profile } from "@/types/domain";
import type { EffectSlug, EffectVolumes } from "@/lib/audio/effects";

type Preferences = Pick<Profile, "musicTrack" | "musicVolume" | "roomVolume" | "backgroundEffects" | "effectVolumes">;
const defaults: Preferences = { musicTrack: null, musicVolume: 0, roomVolume: 0, backgroundEffects: [] };
const emptyEffects: NonNullable<Profile["backgroundEffects"]> = [];
const emptyVolumes: EffectVolumes = {};

export function useAmbience(theme: string) {
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
    backgroundEffects: changes.backgroundEffects ?? profile.data?.backgroundEffects ?? emptyEffects,
    effectVolumes: changes.effectVolumes ?? profile.data?.effectVolumes ?? emptyVolumes,
  };
  const enabled = Object.keys(changes).length > 0
    ? (preferences.backgroundEffects!.length > 0 && preferences.roomVolume > 0) || (preferences.musicTrack !== null && preferences.musicVolume > 0)
    : profile.data?.ambienceEnabled ?? false;
  const save = useCallback(() => {
    const value = pending.current; pending.current = null;
    if (!value) return;
    writes.current = writes.current.catch(() => {}).then(async () => {
      const updated = await repo.updateProfile({ ...value, ambienceEnabled: Boolean(value.backgroundEffects?.length && value.roomVolume > 0) || (value.musicTrack !== null && value.musicVolume > 0) });
      client.setQueryData<Profile>(queryKeys.profile(), current => current ? {
        ...current, musicTrack: updated.musicTrack, musicVolume: updated.musicVolume,
        roomVolume: updated.roomVolume, backgroundEffects: updated.backgroundEffects, effectVolumes: updated.effectVolumes, ambienceEnabled: updated.ambienceEnabled,
      } : updated);
    }).catch(() => { /* Preferences must never block a session. */ });
  }, [client]);
  const update = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    // Configure and unlock within the input gesture, including mobile browsers
    // that require resume() to run before the event handler returns.
    ambience.setMusicTrack(next.musicTrack);
    ambience.setBackgroundEffects(next.backgroundEffects ?? [], next.effectVolumes ?? {});
    ambience.setMusicVolume(next.musicVolume);
    ambience.setRoomVolume(next.roomVolume);
    ambience.init(); setUnlocked(true);
    setChanges(next); pending.current = next;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(save, 500);
  };
  useEffect(() => {
    ambience.setMusicTrack(preferences.musicTrack);
    ambience.setBackgroundEffects(preferences.backgroundEffects ?? [], preferences.effectVolumes ?? {});
    ambience.setMusicVolume(enabled ? preferences.musicVolume : 0);
    ambience.setRoomVolume(enabled ? preferences.roomVolume : 0);
  }, [theme, preferences.musicTrack, preferences.musicVolume, preferences.roomVolume, preferences.backgroundEffects, preferences.effectVolumes, enabled]);
  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
    save(); ambience.destroy();
  }, [save]);
  return {
    ...preferences, isAudible: unlocked && enabled && (Boolean(preferences.backgroundEffects?.length && preferences.roomVolume > 0) || (preferences.musicTrack !== null && preferences.musicVolume > 0)),
    unlock: () => { ambience.init(); setUnlocked(true); },
    setMusicVolume: (musicVolume: number) => update({ musicVolume }),
    setRoomVolume: (roomVolume: number) => update({ roomVolume }),
    setEffectVolume: (slug: EffectSlug, volume: number) => update({ effectVolumes: { ...preferences.effectVolumes, [slug]: volume } }),
    setBackgroundEffects: (backgroundEffects: NonNullable<Profile["backgroundEffects"]>) => update({ backgroundEffects, roomVolume: backgroundEffects.length && preferences.roomVolume === 0 ? 0.3 : preferences.roomVolume }),
    setMusicTrack: (musicTrack: Preferences["musicTrack"]) => update({ musicTrack, musicVolume: musicTrack && preferences.musicVolume === 0 ? 0.3 : preferences.musicVolume }),
  };
}
