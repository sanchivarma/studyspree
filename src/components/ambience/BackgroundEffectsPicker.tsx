"use client";

import { useId } from "react";
import { backgroundEffects, type EffectSlug, type EffectVolumes } from "@/lib/audio/effects";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  selected: readonly EffectSlug[];
  volumes: EffectVolumes;
  disabled?: boolean;
  onSelectionChange: (slugs: EffectSlug[]) => void;
  onVolumeChange: (slug: EffectSlug, volume: number) => void;
};

export function BackgroundEffectsPicker({ selected, volumes, disabled, onSelectionChange, onVolumeChange }: Props) {
  const id = useId();
  const { t } = useTranslation();
  return <fieldset className="my-3 rounded-xl border border-border p-3">
    <legend className="px-1 text-small">{t("ambience.effects")}</legend>
    {backgroundEffects.map(effect => <div key={effect.slug} className="flex min-h-12 items-center gap-2">
      <label className="flex min-h-11 w-32 shrink-0 cursor-pointer items-center gap-2 text-small">
        <input type="checkbox" disabled={disabled} className="size-4 shrink-0 accent-accent" checked={selected.includes(effect.slug)}
          onChange={event => onSelectionChange(event.target.checked ? [...selected, effect.slug] : selected.filter(slug => slug !== effect.slug))} />
        {t(effect.labelKey)}
      </label>
      <div className="min-w-0 flex-1">
        <label htmlFor={`${id}-${effect.slug}`} className="sr-only">{t("ambience.effectVolume", { effect: t(effect.labelKey) })}</label>
        <input id={`${id}-${effect.slug}`} type="range" min={0} max={1} step={0.01} disabled={disabled || !selected.includes(effect.slug)}
          aria-valuetext={`${Math.round((volumes[effect.slug] ?? 1) * 100)}%`}
          value={volumes[effect.slug] ?? 1} onChange={event => onVolumeChange(effect.slug, Number(event.target.value))}
          className="h-11 w-full min-w-0 accent-accent" />
      </div>
      <span aria-hidden="true" className="w-8 shrink-0 text-right text-small tabular-nums text-text-muted">{Math.round((volumes[effect.slug] ?? 1) * 100)}%</span>
    </div>)}
  </fieldset>;
}
