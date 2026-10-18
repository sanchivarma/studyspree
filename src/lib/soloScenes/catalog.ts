import { z } from "zod";

export const deskSlugs = ["modern", "medieval", "shakespearean", "pirate", "sherlock", "kings", "student", "scientist", "submarine", "space-shuttle"] as const;
export const windowSlugs = ["old-castle", "castle-garden", "green-nature", "clouds", "sailing-ships", "sea", "mountains", "space", "underwater", "blackhole", "hogwarts", "rivendell"] as const;
export const soloSceneSchema = z.object({ desk: z.enum(deskSlugs), window: z.enum(windowSlugs) }).strict();
export type SoloScenePreferences = z.infer<typeof soloSceneSchema>;
export const defaultSoloScene: SoloScenePreferences = { desk: "modern", window: "green-nature" };
export const deskSource = (slug: SoloScenePreferences["desk"]) => `/solo/desks/${slug}-v1.webp`;
export const windowSource = (slug: SoloScenePreferences["window"]) => `/solo/views/${slug}-${slug === "sailing-ships" ? "v2" : "v1"}.webp`;
export function windowFrame(slug: SoloScenePreferences["window"]) {
  if(slug === "hogwarts") return "gothic";
  if(slug === "rivendell") return "elven";
  if(slug === "old-castle" || slug === "castle-garden") return "medieval";
  if(slug === "space" || slug === "blackhole" || slug === "underwater") return "metal";
  if(slug === "sailing-ships") return "nautical";
  return "modern";
}
