"use client";
import { createContext } from "react";
import type { SceneMediaManifest } from "@/lib/characters/mediaTypes";

export const SceneMediaContext = createContext<SceneMediaManifest | null>(null);
export function SceneMediaProvider({ manifest, children }: { manifest: SceneMediaManifest; children: React.ReactNode }) {
  return <SceneMediaContext.Provider value={manifest}>{children}</SceneMediaContext.Provider>;
}
