import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { themes } from "./src/lib/themes/registry";

export default function nextConfig(phase: string): NextConfig {
  return {
    devIndicators: false,
    experimental: { serverActions: { bodySizeLimit: "6mb" } },
    // Keep production builds separate; route-group changes require fresh route discovery.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? process.env.STUDYSPREE_VERIFY === "1" ? ".next-verify" : ".next-dev" : ".next",
    outputFileTracingRoot: process.cwd(),
    outputFileTracingExcludes: { "/*": ["./.local/audio/**"] },
    env: { SCENE_MEDIA_MANIFEST: JSON.stringify(Object.fromEntries(themes.map((theme) => [theme.slug, {
      poster: existsSync(join(process.cwd(), "public", theme.poster)),
      webm: existsSync(join(process.cwd(), "public", theme.webm)),
      mp4: existsSync(join(process.cwd(), "public", theme.mp4)),
    }]))) },
    async headers() {
      // Assets are immutable; a new version must ship under a new filename.
      return ["/themes/:path*", "/characters/:path*", "/audio/:path*", "/solo/:path*"].map((source) => ({ source,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      }));
    },
  };
}
