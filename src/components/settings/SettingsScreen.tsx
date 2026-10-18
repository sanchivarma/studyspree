"use client";

import { useState, type CSSProperties } from "react";
import { Shuffle, X } from "lucide-react";
import { AccountControls } from "@/components/layout/AccountControls";
import { ThemeSheet, themeCopy } from "@/components/scene/ThemeSheet";
import { SceneVideo } from "@/components/scene/SceneVideo";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useSetWebcamEnabled } from "@/hooks/useSetWebcamEnabled";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation } from "@/hooks/useTranslation";
import { useTimezones } from "@/hooks/useTimezones";
import { getTheme } from "@/lib/themes/registry";
import { BackgroundEffectsPicker } from "@/components/ambience/BackgroundEffectsPicker";
import { radioStations } from "@/lib/audio/radio";
import { PersonalTileSettings } from "./PersonalTileSettings";

function PreferenceSwitch({ label, checked, disabled, reducedMotion, onChange }: {
  label: string; checked: boolean; disabled: boolean; reducedMotion: boolean; onChange: (value: boolean) => void;
}) {
  return <label className="flex min-h-14 items-center justify-between gap-4">
    <span className="text-body">{label}</span>
    <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)} className="flex h-11 w-14 shrink-0 items-center rounded-full border border-border bg-background px-2 disabled:opacity-60">
      <span aria-hidden="true" style={{ transitionDuration: reducedMotion ? "0ms" : undefined }}
        className={`size-5 rounded-full transition-transform duration-200 motion-reduce:transition-none ${checked ? "translate-x-4 bg-accent" : "bg-text-muted"}`} />
    </button>
  </label>;
}

const fieldClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-body disabled:opacity-60";
const cardClass = "mt-4 rounded-2xl border border-border bg-surface p-5";

export function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  const update = useUpdateProfile();
  const webcam = useSetWebcamEnabled();
  const reducedMotion = useReducedMotion();
  const [timezoneChanged, setTimezoneChanged] = useState(false);
  const preferences = profile.data;
  const radio = radioStations.find(station => `radio:${station.id}` === preferences?.musicTrack);
  const disabled = profile.isPending || !preferences;
  const theme = getTheme(preferences?.selectedTheme ?? "rain-desk");
  const timezones = useTimezones(preferences?.timezone);
  const toggleProps = { disabled, reducedMotion };
  const cameraSaveError = webcam.error && !["NotAllowedError", "NotFoundError", "AbortError"].includes(webcam.error.name);

  return <section style={{ "--accent": theme.accentColor } as CSSProperties} className="mx-auto w-full max-w-2xl px-6 pt-24 pb-8">
    <AccountControls />
    <h1 className="mb-6 text-title">{t("common.settings")}</h1>
    <PersonalTileSettings />
    {(update.error || cameraSaveError) && <p role="alert" className="mb-4 text-small text-text-muted">{t("settings.saveError")}</p>}
    <section className={cardClass}>
      <h2 className="text-body font-semibold">{t("settings.profile")}</h2>
      <label className="mt-4 block text-small">{t("settings.displayName")}
        <input type="text" autoComplete="nickname" maxLength={100} disabled={disabled} value={preferences?.displayName ?? ""}
          onChange={event => update.mutate({ displayName: event.target.value })} className={fieldClass} />
      </label>
      <label className="mt-4 block text-small">{t("settings.timezone")}
        <select disabled={disabled} value={preferences?.timezone ?? "UTC"} className={fieldClass}
          onChange={event => { setTimezoneChanged(true); update.mutate({ timezone: event.target.value }); }}>
          {timezones.map(timezone => <option key={timezone} value={timezone}>{timezone}</option>)}
        </select>
      </label>
      {timezoneChanged && <p role="status" className="mt-3 text-small text-text-muted">{t("settings.timezoneNote")}</p>}
    </section>
    <section className={cardClass}>
      <h2 className="text-body font-semibold">{t("settings.appearance")}</h2>
      <ThemeSheet>
        <button type="button" disabled={disabled} className="mt-4 flex min-h-16 w-full items-center gap-4 rounded-xl border border-border p-3 text-left hover:bg-surface-2 disabled:opacity-60">
          <span className="relative block aspect-video w-20 shrink-0 overflow-hidden rounded-lg"><SceneVideo slug={theme.slug} posterOnly /></span>
          <span className="min-w-0 flex-1 break-words"><span className="block text-small text-text-muted">{t("settings.theme")}</span><span className="block text-body">{t(themeCopy[theme.slug].name)}</span></span>
          <Shuffle aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
        </button>
      </ThemeSheet>
      <PreferenceSwitch {...toggleProps} label={t("settings.reduceMotion")} checked={preferences?.reduceMotion ?? false}
        onChange={reduceMotion => update.mutate({ reduceMotion })} />
    </section>
    <section className={cardClass}>
      <h2 className="text-body font-semibold">{t("settings.sound")}</h2>
      <PreferenceSwitch {...toggleProps} label={t("ambience.label")} checked={preferences?.ambienceEnabled ?? false}
        onChange={ambienceEnabled => update.mutate({ ambienceEnabled })} />
      <p className="mb-4 text-small text-text-muted">{t("ambience.originalNote")}</p>
      {radio?.streamUrl && <label className="block text-small">{t("ambience.radioVolume")}
        <input type="range" min="0" max="1" step="0.05" disabled={disabled} value={preferences?.musicVolume ?? 0}
          onChange={event => update.mutate({ musicVolume: Number(event.target.value) })} className="block h-11 w-full accent-accent" />
      </label>}
      <BackgroundEffectsPicker selected={preferences?.backgroundEffects ?? []} volumes={preferences?.effectVolumes ?? {}} disabled={disabled}
        onSelectionChange={backgroundEffects => update.mutate({ backgroundEffects })}
        onVolumeChange={(slug, volume) => update.mutate({ effectVolumes: { ...preferences?.effectVolumes, [slug]: volume } })} />
      <label className="mt-2 block text-small">{t("ambience.room")}
        <input type="range" min="0" max="1" step="0.05" disabled={disabled} value={preferences?.roomVolume ?? 0}
          onChange={event => update.mutate({ roomVolume: Number(event.target.value) })} className="block h-11 w-full accent-accent" />
      </label>
      <label className="mt-2 block text-small">{t("ambience.radios")}
        <select disabled={disabled} value={preferences?.musicTrack ?? ""} className={fieldClass}
          onChange={event => { const value = event.target.value; const station = radioStations.find(station => `radio:${station.id}` === value); update.mutate({ musicTrack: station ? `radio:${station.id}` : null }); }}>
          <option value="">{t("ambience.off")}</option>
          {radioStations.map(station => <option key={station.id} value={`radio:${station.id}`}>{station.name}</option>)}
        </select>
      </label>
    </section>
    <section className={cardClass}>
      <h2 className="text-body font-semibold">{t("settings.camera")}</h2>
      <PreferenceSwitch {...toggleProps} disabled={disabled || webcam.isPending} label={t("settings.selfView")} checked={preferences?.webcamEnabled ?? false}
        onChange={webcamEnabled => webcam.mutate(webcamEnabled)} />
      <p className="text-small text-text-muted">{t("settings.cameraPrivacy")}</p>
      {webcam.permissionNote && <div role="note" className="mt-3 flex items-center gap-2">
        <p className="flex-1 text-small text-text-muted">{t("webcam.permissionNote")}</p>
        <button type="button" aria-label={t("webcam.dismiss")} onClick={webcam.dismissNote} className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-surface-2"><X aria-hidden="true" className="size-4" /></button>
      </div>}
    </section>
    <section className={cardClass}>
      <h2 className="text-body font-semibold">{t("settings.progress")}</h2>
      <PreferenceSwitch {...toggleProps} label={t("settings.showStreak")} checked={preferences?.showStreak ?? true}
        onChange={showStreak => update.mutate({ showStreak })} />
    </section>
  </section>;
}
