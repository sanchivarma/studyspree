import { humanCharacterSlugs, type CharacterDefinition } from "@/types/characters";

export const characters: readonly CharacterDefinition[] = [...humanCharacterSlugs.map((slug, index): CharacterDefinition => ({
  slug,
  presentation: index < 4 ? "male" : "female",
  style: "illustrated",
  nameKey: `characters.${slug}`,
  descriptionKey: index % 2 === 0 ? "characters.reading" : "characters.writing",
  activity: index % 2 === 0 ? "reading" : "writing",
  gif: `/characters/${slug}/study-v1.gif`,
  poster: `/characters/${slug}/poster-v1.webp`,
  webm: `/characters/${slug}/study-v2.webm`,
  mp4: `/characters/${slug}/study-v2.mp4`,
  loopSeconds: 150,
  assetVersion: "v2",
  licenceId: `studyspree-original-${slug}-v1`,
})), ...(["moss-fox", "pip-owl", "momo-cloud"] as const).map((slug): CharacterDefinition => ({
  slug, presentation: "neutral", style: "whimsical", nameKey: `characters.${slug}`,
  descriptionKey: "characters.reading", activity: "reading", gif: `/characters/${slug}/study-v1.gif`,
  poster: `/characters/${slug}/poster-v1.webp`, webm: `/characters/${slug}/study-v2.webm`, mp4: `/characters/${slug}/study-v2.mp4`,
  loopSeconds: 150, assetVersion: "v2", licenceId: `studyspree-original-${slug}-v1`,
})), ...(["realistic-01", "realistic-02"] as const).map((slug, index): CharacterDefinition => ({
  slug, presentation: index === 0 ? "male" : "female", style: "realistic", nameKey: `characters.${slug}`,
  descriptionKey: "characters.staticPreview", activity: "studying", gif: null,
  poster: `/characters/${slug}/poster-v1.webp`, webm: null, mp4: null, loopSeconds: null,
  assetVersion: "v1", licenceId: `studyspree-ai-${slug}-v1`,
}))];

export function getCharacter(slug: string): CharacterDefinition | null {
  return characters.find(character => character.slug === slug) ?? null;
}
