import { z } from "zod";

export const deskSlugs = ["modern", "medieval", "shakespearean", "pirate", "kings", "student", "scientist", "submarine", "space-shuttle"] as const;
export const windowSlugs = ["old-castle", "castle-garden", "sailing-ships", "sea", "mountains", "space", "underwater", "magic-academy", "waterfall"] as const;
// Upgrade saved choices without discarding the rest of the profile.
const savedWindow = z.enum([...windowSlugs, "green-nature", "clouds", "blackhole", "rivendell"])
  .transform(value => value === "green-nature" || value === "clouds" || value === "blackhole" ? "sea" : value === "rivendell" ? "waterfall" : value);
const savedDesk = z.enum([...deskSlugs, "sherlock"]).transform(value => value === "sherlock" ? "modern" : value);
export const soloSceneSchema = z.object({ desk: savedDesk, window: savedWindow }).strict();
export type SoloScenePreferences = z.infer<typeof soloSceneSchema>;
export const defaultSoloScene: SoloScenePreferences = { desk: "modern", window: "sea" };
export const deskSource = (slug: SoloScenePreferences["desk"]) => `/solo/desks/${slug}-wide-v3.webp`;
export const deskPreviewSource = (slug: SoloScenePreferences["desk"]) => `/solo/desks/${slug}-original-fit-v1.webp`;
// Preserve the two clips explicitly approved by the user. Replacements use new
// immutable names so browser/CDN caches cannot replay the rejected animation.
const windowMediaVersion = (slug: SoloScenePreferences["window"]) => {
  if (slug === "old-castle" || slug === "mountains") return "filmed-v2";
  if (slug === "waterfall") return "filmed-v5";
  if (slug === "underwater") return "filmed-v7";
  if (slug === "magic-academy" || slug === "castle-garden") return "filmed-v8";
  return "filmed-v6";
};
const mediaSlug = (slug: SoloScenePreferences["window"]) => slug === "waterfall" ? "rivendell" : slug;
export const windowSource = (slug: SoloScenePreferences["window"]) => `/solo/views/${mediaSlug(slug)}-${windowMediaVersion(slug)}.webp`;
export const windowVideoSource = (slug: SoloScenePreferences["window"]) => `/solo/views/${mediaSlug(slug)}-${windowMediaVersion(slug)}.mp4`;
export function windowFrame(slug: SoloScenePreferences["window"]) {
  if(slug === "magic-academy") return "gothic";
  if(slug === "waterfall") return "elven";
  if(slug === "old-castle") return "medieval";
  if(slug === "castle-garden") return "georgian";
  if(slug === "space") return "shuttle";
  if(slug === "underwater") return "submarine";
  if(slug === "sailing-ships") return "nautical";
  return "modern";
}
