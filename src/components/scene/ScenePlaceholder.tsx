"use client";

import { useId, type CSSProperties } from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { getCharacter } from "@/lib/characters/registry";
import { cn } from "@/lib/utils";

export type ScenePlaceholderProps = {
  slug: string;
  className?: string;
};

export function ScenePlaceholder({ slug, className }: ScenePlaceholderProps) {
  const character = getCharacter(slug);
  const grainId = useId();
  const isVisible = usePageVisibility();
  const sceneStyle = { "--accent": character.accentColor } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 isolate overflow-hidden", className)}
      style={sceneStyle}
      data-character={character.slug}
    >
      <div
        className="scene-placeholder-gradient"
        style={{
          background: character.gradient,
          animationPlayState: isVisible ? "running" : "paused",
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" focusable="false">
        <defs>
          <filter id={grainId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>
      <div className="scene-placeholder-vignette absolute inset-0" />
    </div>
  );
}
