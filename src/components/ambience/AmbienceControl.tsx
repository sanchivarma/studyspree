"use client";

import { Popover } from "radix-ui";
import { Volume2, VolumeX } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useAmbience } from "@/hooks/useAmbience";
import { useTranslation } from "@/hooks/useTranslation";
import { BackgroundEffectsPicker } from "./BackgroundEffectsPicker";
import { RadioPlayer } from "./RadioPlayer";
import { radioStations } from "@/lib/audio/radio";
import { cn } from "@/lib/utils";
import { getTheme } from "@/lib/themes/registry";

export function AmbienceControl({ theme, onOpenChange, className }: { theme: string; onOpenChange: (open: boolean) => void; className?: string }) {
  const audio = useAmbience(theme);
  const { t } = useTranslation();
  const Icon = audio.isAudible ? Volume2 : VolumeX;
  const [hasOpened, setHasOpened] = useState(false);
  const station = radioStations.find(station => `radio:${station.id}` === audio.musicTrack);
  return <Popover.Root onOpenChange={open => { if (open) { setHasOpened(true); audio.unlock(); } onOpenChange(open); }}>
    <Popover.Trigger asChild>
      <button type="button" aria-label={t("session.sound")} title={t("session.sound")}
        className={cn("absolute bottom-6 left-4 flex size-11 items-center justify-center rounded-xl text-foreground/60 hover:bg-background/30 sm:left-6", className)}>
        <Icon aria-hidden="true" className="size-5" />
      </button>
    </Popover.Trigger>
    <Popover.Portal forceMount>
      <Popover.Content forceMount aria-label={t("ambience.label")} data-testid="ambience-popover" side="top" align="start" sideOffset={8} collisionPadding={16}
        style={{ "--accent": getTheme(theme).accentColor } as CSSProperties}
        onKeyDown={event => event.stopPropagation()}
        className="z-50 max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100dvw-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-lg data-[state=closed]:hidden">
        <h2 className="text-body font-semibold">{t("ambience.label")}</h2>
        <p className="mt-1 text-small text-text-muted">{t("ambience.originalNote")}</p>
        <BackgroundEffectsPicker selected={audio.backgroundEffects ?? []} volumes={audio.effectVolumes ?? {}}
          onSelectionChange={audio.setBackgroundEffects} onVolumeChange={audio.setEffectVolume} />
        <label className="block text-small" htmlFor="room-volume">{t("ambience.room")}</label>
        <input id="room-volume" type="range" min={0} max={1} step={0.05} disabled={!audio.backgroundEffects?.length} value={audio.roomVolume} onChange={event => audio.setRoomVolume(Number(event.target.value))}
          className="h-11 w-full accent-accent" />
        <fieldset className="mt-4"><legend className="text-small font-semibold">{t("ambience.radios")}</legend>
          {radioStations.map(station => <label key={station.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-small">
            <input type="radio" name="music-track" checked={audio.musicTrack === `radio:${station.id}`} onChange={() => audio.setMusicTrack(`radio:${station.id}`)} className="size-4 accent-accent" />
            {station.name}
          </label>)}
        </fieldset>
        <button type="button" onClick={() => audio.setMusicTrack(null)} className="mt-2 min-h-11 rounded-lg border border-border px-3 text-small hover:bg-surface-2">{t("ambience.radioOff")}</button>
        {station?.streamUrl && <label className="mt-3 block text-small">{t("ambience.radioVolume")}
          <input type="range" min={0} max={1} step={0.05} value={audio.musicVolume} onChange={event => audio.setMusicVolume(Number(event.target.value))} className="block h-11 w-full accent-accent" />
        </label>}
        {station?.embedUrl && <p className="mt-3 text-small text-text-muted">{t("ambience.playerVolume")}</p>}
        {station?.embedUrl && hasOpened && <RadioPlayer key={station.id} name={station.name} src={station.embedUrl} />}
        {station && <a href={station.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-small underline">{t("ambience.stationWebsite")}</a>}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
