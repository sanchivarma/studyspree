"use client";
/* eslint-disable @next/next/no-img-element -- Direct poster loading preserves the requested load/error fallback and immutable asset URL. */

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getTheme, type Theme } from "@/lib/themes/registry";
import type { SceneMedia } from "@/lib/themes/mediaTypes";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useProfile } from "@/hooks/useProfile";
import { SceneMediaContext } from "./SceneMediaProvider";
import { cn } from "@/lib/utils";

export type SceneVideoProps = { slug: string; className?: string; priority?: boolean; posterOnly?: boolean };

export function SceneVideo({ slug, className, priority = false, posterOnly = false }: SceneVideoProps) {
  const theme = getTheme(slug);
  const manifest = useContext(SceneMediaContext);
  const media = manifest?.[theme.slug] ?? { poster: true, webm: true, mp4: true };
  const reducedMotion = useReducedMotion();
  const profile = useProfile();
  return <div aria-hidden="true" data-theme={theme.slug} data-testid="scene-video" style={{ containerType: "size" }} className={cn("pointer-events-none absolute inset-0 isolate overflow-hidden", className)}>
    <SceneLayers key={theme.slug} theme={theme} media={media} priority={priority} reducedMotion={posterOnly || reducedMotion || profile.isPending} />
  </div>;
}

function SceneLayers({ theme, media, priority, reducedMotion }: { theme: Theme; media: SceneMedia; priority: boolean; reducedMotion: boolean }) {
  const [posterReady, setPosterReady] = useState(false);
  const poster = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    // A cached poster may finish loading before hydration attaches onLoad.
    if (poster.current?.complete && poster.current.naturalWidth > 0) setPosterReady(true);
  }, []);
  return <>
    <div data-testid="scene-gradient" className="absolute inset-0" style={{ background: theme.gradient }} />
    {/* A fixed 16:9 surface covers the containing scene in either orientation.
        Absolute media never participate in the page's document layout. */}
    <div className="absolute top-1/2 left-1/2 aspect-video -translate-x-1/2 -translate-y-1/2" style={{ width: "max(100cqw, 177.777778cqh)" }}>
      {media.poster && <img ref={poster} src={theme.poster} alt="" width={1920} height={1080} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"}
        className="absolute inset-0 h-full w-full object-cover" style={{ opacity: posterReady ? 1 : 0 }} onLoad={() => setPosterReady(true)} onError={() => setPosterReady(false)} />}
      {!reducedMotion && (media.webm || media.mp4) && <SceneMovie key={theme.slug} theme={theme} media={media} priority={priority} />}
    </div>
    <div className="scene-placeholder-vignette absolute inset-0" />
  </>;
}

function SceneMovie({ theme, media, priority }: { theme: Theme; media: SceneMedia; priority: boolean }) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const sourceErrors = useRef(0);
  const sources = [media.webm ? { src: theme.webm, type: "video/webm" } : null, media.mp4 ? { src: theme.mp4, type: "video/mp4" } : null].filter((source) => source !== null);

  useEffect(() => {
    const element = video.current;
    if (!element || videoFailed) return;
    if (element.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) setVideoReady(true);
    const update = () => {
      if (document.hidden) element.pause();
      else void element.play().catch(() => { /* Autoplay rejection leaves the poster/gradient available. */ });
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => { document.removeEventListener("visibilitychange", update); element.pause(); };
  }, [videoFailed, sources.length]);

  const fail = () => { setVideoReady(false); setVideoFailed(true); video.current?.pause(); };
  return <video key={theme.slug} ref={video} muted loop playsInline autoPlay preload={priority ? "auto" : "metadata"}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms] motion-reduce:transition-none" style={{ opacity: videoReady && !videoFailed ? 1 : 0 }}
        onCanPlayThrough={() => { if (!videoFailed) setVideoReady(true); }} onError={fail}>
        {sources.map((source) => <source key={source.src} src={source.src} type={source.type} onError={() => {
          sourceErrors.current += 1;
          if (sourceErrors.current >= sources.length) fail();
        }} />)}
      </video>;
}
