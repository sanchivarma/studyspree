"use client";
/* eslint-disable @next/next/no-img-element -- Original animated GIFs must load directly and unmount when paused; posters preserve matching immutable URLs. */

import { memo, useEffect, useRef, useState } from "react";
import { getCharacter } from "@/lib/characters/registry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useTranslation } from "@/hooks/useTranslation";
import type { CharacterSlug } from "@/types/characters";
import { cn } from "@/lib/utils";

export const CharacterLoop = memo(function CharacterLoop({ slug, className, active = true, priority = false }: {
  slug: CharacterSlug; className?: string; active?: boolean; priority?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisibility();
  const root = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready, setReady] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState<string | null>(null);
  const [movieFailed, setMovieFailed] = useState<string | null>(null);
  const character = getCharacter(slug);
  const { t } = useTranslation();
  useEffect(() => {
    const target = root.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      setOnScreen(visible);
      if (visible) setSeen(true);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const animate = Boolean(character && (character.gif || character.webm || character.mp4)) && active && pageVisible && onScreen && !reducedMotion && failed !== slug;
  const showMovie = seen && active && !reducedMotion && movieFailed !== slug && Boolean(character?.webm || character?.mp4);
  return <div ref={root} data-testid={`character-loop-${slug}`} data-animated={animate}
    role="img" aria-label={`${character ? t(character.nameKey) : slug} — ${t("characters.virtualLabel")}`}
    className={cn("relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2", className)}>
    {character && posterFailed !== slug && <img src={character.poster} alt="" aria-hidden="true" width={480} height={360}
      loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setPosterFailed(slug)} className="absolute inset-0 h-full w-full object-cover" />}
    {character && showMovie && <CharacterMovie key={slug} playing={animate} webm={character.webm} mp4={character.mp4} onReady={() => setReady(`${slug}:movie`)} onError={() => setMovieFailed(slug)} ready={ready === `${slug}:movie`}/>}
    {character?.gif && animate && !showMovie && <img key={slug} src={character.gif} alt="" aria-hidden="true" width={480} height={360}
      onLoad={() => setReady(slug)} onError={() => setFailed(slug)} data-testid="character-animation"
      className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none", ready === slug ? "opacity-100" : "opacity-0")} />}
    {posterFailed === slug && <span className="absolute inset-0 flex items-center justify-center p-4 text-small text-text-muted">{t("characters.virtualLabel")}</span>}
  </div>;
});

function CharacterMovie({ webm, mp4, onReady, onError, ready, playing }: { webm: string | null; mp4: string | null; onReady: () => void; onError: () => void; ready: boolean; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const errors = useRef(0);
  const count = Number(Boolean(webm)) + Number(Boolean(mp4));
  useEffect(() => {
    const movie = ref.current;
    if (playing) void movie?.play().catch(() => {});
    else movie?.pause();
    return () => movie?.pause();
  }, [playing]);
  const sourceError = () => { if (++errors.current >= count) onError(); };
  return <video ref={ref} muted autoPlay={playing} loop playsInline preload={playing ? "auto" : "metadata"} data-testid="character-animation" aria-hidden="true" onCanPlay={onReady} onError={onError} className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none", ready ? "opacity-100" : "opacity-0")}>
    {mp4 && <source src={mp4} type="video/mp4" onError={sourceError}/>}{webm && <source src={webm} type="video/webm" onError={sourceError}/>}
  </video>;
}
