"use client";

import { Popover } from "radix-ui";
import { Volume2, VolumeX } from "lucide-react";
import type { CSSProperties } from "react";
import { useAmbience } from "@/hooks/useAmbience";
import { useTranslation } from "@/hooks/useTranslation";
import { musicTracks } from "@/lib/audio/catalog";
import { getTheme } from "@/lib/themes/registry";

export function AmbienceControl({ theme, onOpenChange }: { theme: string; onOpenChange: (open: boolean) => void }) {
  const audio = useAmbience(theme);
  const { t } = useTranslation();
  const Icon = audio.isAudible ? Volume2 : VolumeX;
  return <Popover.Root onOpenChange={open => { if (open) audio.unlock(); onOpenChange(open); }}>
    <Popover.Trigger asChild>
      <button type="button" aria-label={t("session.sound")} title={t("session.sound")}
        className="absolute bottom-6 left-4 flex size-11 items-center justify-center rounded-xl text-foreground/60 hover:bg-background/30 sm:left-6">
        <Icon aria-hidden="true" className="size-5" />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content aria-label={t("ambience.label")} data-testid="ambience-popover" side="top" align="start" sideOffset={8} collisionPadding={16}
        style={{ "--accent": getTheme(theme).accentColor } as CSSProperties}
        onKeyDown={event => event.stopPropagation()}
        className="z-50 max-h-[calc(100dvh-6rem)] w-72 max-w-[calc(100dvw-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-lg">
        <h2 className="text-body font-semibold">{t("ambience.label")}</h2>
        <p className="mt-1 text-small text-text-muted">{t("ambience.originalNote")}</p>
        <label className="mt-4 block text-small" htmlFor="music-volume">{t("ambience.music")}</label>
        <input id="music-volume" type="range" min={0} max={1} step={0.05} value={audio.musicVolume} onChange={event => audio.setMusicVolume(Number(event.target.value))}
          className="h-11 w-full accent-accent" />
        <label className="block text-small" htmlFor="room-volume">{t("ambience.room")}</label>
        <input id="room-volume" type="range" min={0} max={1} step={0.05} value={audio.roomVolume} onChange={event => audio.setRoomVolume(Number(event.target.value))}
          className="h-11 w-full accent-accent" />
        <fieldset className="mt-2"><legend className="text-small text-text-muted">{t("ambience.tracks")}</legend>
          {[{ slug: null, labelKey: "ambience.off" as const }, ...musicTracks].map(track => <label key={track.slug ?? "off"} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-small hover:bg-surface-2">
            <input type="radio" name="music-track" value={track.slug ?? "off"} checked={audio.musicTrack === track.slug} onChange={() => audio.setMusicTrack(track.slug)} className="size-4 accent-accent" />
            {t(track.labelKey)}
          </label>)}
        </fieldset>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
