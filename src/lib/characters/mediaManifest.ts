import "server-only";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { characters } from "./registry";
import type { SceneMediaManifest } from "./mediaTypes";

const media = z.object({ poster: z.boolean(), webm: z.boolean(), mp4: z.boolean() });
const manifestSchema = z.object({ "rain-desk": media, "night-shift": media, "balcony-dusk": media, "dorm-bunk": media });
export async function getSceneMediaManifest(): Promise<SceneMediaManifest> {
  // Production assets may live on a CDN rather than the server filesystem.
  // Use the availability snapshot embedded at build time in that environment.
  if (process.env.NODE_ENV === "production") {
    try {
      const result = manifestSchema.safeParse(JSON.parse(process.env.SCENE_MEDIA_MANIFEST ?? "null"));
      if (result.success) return result.data;
    } catch { /* Keep the fallback safe for an incomplete deployment. */ }
  }
  const exists = async (path: string) => {
    try { return (await stat(join(process.cwd(), "public", path))).isFile(); } catch { return false; }
  };
  const entries = await Promise.all(characters.map(async (character) => {
    const [poster, webm, mp4] = await Promise.all([exists(character.poster), exists(character.webm), exists(character.mp4)]);
    return [character.slug, { poster, webm, mp4 }] as const;
  }));
  return Object.fromEntries(entries) as SceneMediaManifest;
}
