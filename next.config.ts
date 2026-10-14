import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { characters } from "./src/lib/characters/registry";

export default function nextConfig(phase: string): NextConfig {
  return {
    devIndicators: false,
    // Keep production builds separate; route-group changes require fresh route discovery.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    outputFileTracingRoot: process.cwd(),
    env: { SCENE_MEDIA_MANIFEST: JSON.stringify(Object.fromEntries(characters.map((character) => [character.slug, {
      poster: existsSync(join(process.cwd(), "public", character.poster)),
      webm: existsSync(join(process.cwd(), "public", character.webm)),
      mp4: existsSync(join(process.cwd(), "public", character.mp4)),
    }]))) },
    async headers() {
      // Assets are immutable; a new version must ship under a new filename.
      return ["/characters/:path*", "/audio/:path*"].map((source) => ({ source,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      }));
    },
  };
}
