import { z } from "zod";

export const deskSlugs = ["modern", "medieval", "shakespearean", "pirate", "sherlock", "kings", "student", "scientist", "submarine", "space-shuttle"] as const;
export const windowSlugs = ["old-castle", "castle-garden", "green-nature", "clouds", "sailing-ships", "sea", "mountains", "space", "underwater", "blackhole", "magic-academy", "rivendell"] as const;
export const soloSceneSchema = z.object({ desk: z.enum(deskSlugs), window: z.enum(windowSlugs) }).strict();
export type SoloScenePreferences = z.infer<typeof soloSceneSchema>;
export const defaultSoloScene: SoloScenePreferences = { desk: "modern", window: "green-nature" };
export const deskSource = (slug: SoloScenePreferences["desk"]) => `/solo/desks/${slug}-wide-v3.webp`;
export const deskPreviewSource = (slug: SoloScenePreferences["desk"]) => `/solo/desks/${slug}-original-fit-v1.webp`;
// Preserve the two clips explicitly approved by the user. Replacements use new
// immutable names so browser/CDN caches cannot replay the rejected animation.
const windowMediaVersion = (slug: SoloScenePreferences["window"]) => {
  if (slug === "old-castle" || slug === "mountains") return "filmed-v2";
  if (["castle-garden", "clouds", "rivendell", "underwater"].includes(slug)) return "filmed-v5";
  if (slug === "magic-academy" || slug === "sailing-ships" || slug === "space" || slug === "blackhole") return "filmed-v4";
  return "filmed-v3";
};
export const windowSource = (slug: SoloScenePreferences["window"]) => `/solo/views/${slug}-${windowMediaVersion(slug)}.webp`;
export const windowVideoSource = (slug: SoloScenePreferences["window"]) => `/solo/views/${slug}-${windowMediaVersion(slug)}.mp4`;
export function windowFrame(slug: SoloScenePreferences["window"]) {
  if(slug === "magic-academy") return "gothic";
  if(slug === "rivendell") return "elven";
  if(slug === "old-castle" || slug === "castle-garden") return "medieval";
  if(slug === "space" || slug === "blackhole") return "shuttle";
  if(slug === "underwater") return "submarine";
  if(slug === "sailing-ships") return "nautical";
  return "modern";
}
