"use client";

import { useRef, useState, type CSSProperties, type RefObject } from "react";
import { themes, type ThemeSlug } from "@/lib/themes/registry";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/translations";
import { SceneVideo } from "./SceneVideo";
import { cn } from "@/lib/utils";

export const themeCopy: Record<ThemeSlug, { name: TranslationKey; description: TranslationKey }> = {
  "nature-day": { name: "scene.natureDay", description: "scene.natureDayDescription" },
  "nature-night": { name: "scene.natureNight", description: "scene.natureNightDescription" },
  "sci-fi": { name: "scene.sciFi", description: "scene.sciFiDescription" },
  "space": { name: "scene.space", description: "scene.spaceDescription" },
  "rain-desk": { name: "stats.rainDesk", description: "scene.rainDeskDescription" },
  "night-shift": { name: "stats.nightShift", description: "scene.nightShiftDescription" },
  "balcony-dusk": { name: "stats.balconyDusk", description: "scene.balconyDuskDescription" },
  "dorm-bunk": { name: "stats.dormBunk", description: "scene.dormBunkDescription" },
};

export function ThemeGrid({ selectedTheme, onSelect, cardRefs }: {
  selectedTheme: ThemeSlug; onSelect: (slug: ThemeSlug) => void;
  cardRefs?: RefObject<(HTMLButtonElement | null)[]>;
}) {
  const localRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cards = cardRefs ?? localRefs;
  const [hovered, setHovered] = useState<ThemeSlug | null>(null);
  const [focusSlug, setFocusSlug] = useState<ThemeSlug | null>(null);
  const canHover = useMediaQuery("(min-width: 768px) and (hover: hover) and (pointer: fine)");
  const visible = usePageVisibility();
  const { t } = useTranslation();
  return <div role="group" aria-label={t("scene.title")} className="grid grid-cols-2 gap-3">
    {themes.map((theme, index) => {
      const copy = themeCopy[theme.slug];
      const selected = selectedTheme === theme.slug;
      return <button key={theme.slug} type="button" ref={element => { cards.current[index] = element; }}
        data-testid={`theme-card-${theme.slug}`} aria-pressed={selected}
        tabIndex={(focusSlug ?? selectedTheme) === theme.slug ? 0 : -1}
        onFocus={() => setFocusSlug(theme.slug)} onPointerEnter={() => setHovered(theme.slug)} onPointerLeave={() => setHovered(null)}
        style={{ "--accent": theme.accentColor } as CSSProperties}
        className={cn("min-w-0 rounded-xl border bg-surface p-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent", selected ? "border-accent ring-2 ring-accent" : "border-border hover:border-accent/60")}
        onKeyDown={event => {
          const column = index % 2, row = Math.floor(index / 2);
          const next = event.key === "ArrowRight" || event.key === "ArrowLeft" ? row * 2 + (column + 1) % 2
            : event.key === "ArrowDown" || event.key === "ArrowUp" ? ((row + 1) % 2) * 2 + column : null;
          if (next !== null) { event.preventDefault(); event.stopPropagation(); cards.current[next]?.focus(); }
        }} onClick={() => onSelect(theme.slug)}>
        <div className="relative aspect-video overflow-hidden rounded-lg"><SceneVideo slug={theme.slug} posterOnly={!canHover || hovered !== theme.slug || !visible} /></div>
        <span className="mt-2 block px-1 text-small font-semibold">{t(copy.name)}</span>
        <span className="mt-1 mb-1 block truncate px-1 text-[11px] text-text-muted" title={t(copy.description)}>{t(copy.description)}</span>
      </button>;
    })}
  </div>;
}
