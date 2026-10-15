export const characterSlugs = ["male-01", "male-02", "male-03", "male-04", "female-01", "female-02", "female-03", "female-04"] as const;
export type CharacterSlug = typeof characterSlugs[number];
export type CompanionMode = "solo" | "characters" | "people" | "mixed";
export type CompanionPreferences = { mode: CompanionMode; characterSlugs: CharacterSlug[] };
export type CharacterDefinition = {
  slug: CharacterSlug;
  presentation: "male" | "female";
  nameKey: import("@/translations").TranslationKey;
  descriptionKey: import("@/translations").TranslationKey;
  activity: "reading" | "writing" | "studying";
  gif: string;
  poster: string;
  webm: string | null;
  mp4: string | null;
  assetVersion: string;
  licenceId: string;
};
