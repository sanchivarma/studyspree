"use client";

import { useRef, useState } from "react";
import { characters } from "@/lib/characters/registry";
import { useTranslation } from "@/hooks/useTranslation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { CharacterSlug, CharacterDefinition } from "@/types/characters";
import { CharacterLoop } from "./CharacterLoop";
import { cn } from "@/lib/utils";

export function CharacterPicker({ selected, onChange }: { selected: CharacterSlug[]; onChange: (slugs: CharacterSlug[]) => void }) {
  const { t } = useTranslation();
  const desktop = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [preview, setPreview] = useState<CharacterSlug | null>(null);
  const [focused, setFocused] = useState(0);
  const [style, setStyle] = useState<CharacterDefinition["style"] | "all">("all");
  const shown = characters.filter(character => style === "all" || character.style === style);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  return <fieldset>
    <legend className="mb-3 text-small text-text-muted">{t("characters.selected", { count: selected.length })}</legend>
    <div aria-label={t("characters.styles")} className="mb-3 flex flex-wrap gap-2">{(["all", "illustrated", "whimsical", "realistic", "historical"] as const).map(value => <button key={value} type="button" aria-pressed={style === value} onClick={() => { setStyle(value); setFocused(0); }} className={cn("min-h-11 rounded-xl border px-3 text-small", style === value ? "border-accent bg-accent/10" : "border-border")}>{t(`characters.${value}`)}</button>)}</div>
    <p className="mb-3 text-small text-text-muted">{t("characters.limit")}</p>
    <div className="grid grid-cols-2 gap-3" data-testid="character-picker">
      {shown.map((character, index) => <button key={character.slug} type="button" ref={node => { cards.current[index] = node; }}
        tabIndex={focused === index ? 0 : -1} aria-pressed={selected.includes(character.slug)}
        aria-disabled={!selected.includes(character.slug) && selected.length >= characters.length}
        aria-label={`${t(character.nameKey)} — ${t(character.descriptionKey)}`} data-testid={`character-card-${character.slug}`}
        className={cn("min-h-11 rounded-xl border p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", selected.includes(character.slug) ? "border-accent bg-accent/10" : "border-border bg-surface")}
        onMouseEnter={() => setPreview(character.slug)} onMouseLeave={() => setPreview(null)}
        onFocus={() => { setFocused(index); setPreview(character.slug); }} onBlur={() => setPreview(null)}
        onKeyDown={event => {
          const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 };
          if (!(event.key in moves)) return;
          event.preventDefault();
          cards.current[(index + moves[event.key] + shown.length) % shown.length]?.focus();
        }}
        onClick={() => { if (selected.includes(character.slug)) onChange(selected.filter(slug => slug !== character.slug)); else if (selected.length < characters.length) onChange([...selected, character.slug]); }}>
        <CharacterLoop slug={character.slug} active={desktop && preview === character.slug} />
        <span className="mt-2 block text-small font-semibold">{t(character.nameKey)}</span>
        <span className="block text-[12px] text-text-muted">{t(character.descriptionKey)}</span>
        {character.backgroundKey && <span className="block text-[12px] text-text-muted">{t(character.backgroundKey)}</span>}
      </button>)}
    </div>
  </fieldset>;
}
