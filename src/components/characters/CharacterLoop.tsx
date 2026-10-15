"use client";
/* eslint-disable @next/next/no-img-element -- Original animated GIFs must load directly and unmount when paused; posters preserve matching immutable URLs. */

import { useEffect, useRef, useState } from "react";
import { getCharacter } from "@/lib/characters/registry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useTranslation } from "@/hooks/useTranslation";
import type { CharacterSlug } from "@/types/characters";
import { cn } from "@/lib/utils";

export function CharacterLoop({ slug, className, active = true, priority = false }: {
  slug: CharacterSlug; className?: string; active?: boolean; priority?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisibility();
  const root = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready, setReady] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState<string | null>(null);
  const character = getCharacter(slug);
  const { t } = useTranslation();
  useEffect(() => {
    const target = root.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => setOnScreen(entries.some(entry => entry.isIntersecting)));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const animate = active && pageVisible && onScreen && !reducedMotion && failed !== slug;
  return <div ref={root} data-testid={`character-loop-${slug}`} data-animated={animate}
    role="img" aria-label={`${character ? t(character.nameKey) : slug} — ${t("characters.virtualLabel")}`}
    className={cn("relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2", className)}>
    {character && posterFailed !== slug && <img src={character.poster} alt="" aria-hidden="true" width={480} height={360}
      loading={priority ? "eager" : "lazy"} onError={() => setPosterFailed(slug)} className="absolute inset-0 h-full w-full object-cover" />}
    {character && animate && <img key={slug} src={character.gif} alt="" aria-hidden="true" width={480} height={360}
      onLoad={() => setReady(slug)} onError={() => setFailed(slug)} data-testid="character-animation"
      className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none", ready === slug ? "opacity-100" : "opacity-0")} />}
    {posterFailed === slug && <span className="absolute inset-0 flex items-center justify-center p-4 text-small text-text-muted">{t("characters.virtualLabel")}</span>}
  </div>;
}
