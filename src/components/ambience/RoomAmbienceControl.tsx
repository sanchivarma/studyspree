"use client";
import { Popover } from "radix-ui";
import { Volume2, VolumeX } from "lucide-react";
import { useRoomAudio } from "@/hooks/useRoomAudio";
import { useTranslation } from "@/hooks/useTranslation";
import { radioStations } from "@/lib/audio/radio";
import type { RoomControls } from "@/lib/community/roomControls";
import { BackgroundEffectsPicker } from "./BackgroundEffectsPicker";
import { RadioPlayer } from "./RadioPlayer";

export function RoomAmbienceControl({ id, controls, isCreator, locked, className }: { id: string; controls: RoomControls; isCreator: boolean; locked: boolean; className: string }) {
  const { t } = useTranslation();
  const sound = useRoomAudio(id, controls, isCreator, locked);
  const station = radioStations.find(station => `radio:${station.id}` === sound.audio.musicTrack);
  const Icon = sound.listening && !locked ? Volume2 : VolumeX;
  return <Popover.Root><Popover.Trigger asChild><button type="button" aria-label={t("session.sound")} className={className}><Icon aria-hidden="true" className="size-4"/></button></Popover.Trigger>
    <Popover.Portal forceMount><Popover.Content forceMount onKeyDown={event => event.stopPropagation()} side="right" collisionPadding={12} className="z-50 max-h-[80dvh] w-80 max-w-[calc(100dvw-4rem)] overflow-y-auto rounded-xl border border-border bg-surface p-4 data-[state=closed]:hidden">
      <h2 className="font-semibold">{t("ambience.label")}</h2>
      <p className="my-2 text-small text-text-muted">{t(locked ? "roomControls.alwaysSilent" : isCreator ? "roomControls.hostSound" : "roomControls.guestSound")}</p>
      {!locked && <>
        <button type="button" onClick={sound.toggleListening} className="min-h-11 rounded-xl border border-border px-3">{t(sound.listening ? "roomControls.muteLocally" : "roomControls.listen")}</button>
        {isCreator && <>
          <BackgroundEffectsPicker selected={sound.audio.backgroundEffects} volumes={sound.audio.effectVolumes}
            onSelectionChange={backgroundEffects => sound.update({ backgroundEffects, roomVolume: sound.audio.roomVolume || 0.3 })}
            onVolumeChange={(slug, value) => sound.update({ effectVolumes: { ...sound.audio.effectVolumes, [slug]: value } })}/>
          <label className="block text-small">{t("ambience.radios")}<select value={sound.audio.musicTrack ?? ""} onChange={event => sound.update({ musicTrack: event.target.value || null, musicVolume: sound.audio.musicVolume || 0.3 })} className="my-2 min-h-11 w-full rounded-xl border border-border bg-background px-3">
            <option value="">{t("ambience.off")}</option>{radioStations.map(station => <option key={station.id} value={`radio:${station.id}`}>{station.name}</option>)}
          </select></label>
        </>}
        {station?.embedUrl && sound.listening && <RadioPlayer name={station.name} src={station.embedUrl}/>}
        {sound.isError && <p role="alert" className="mt-2 text-small">{t("community.unavailable")}</p>}
      </>}
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
