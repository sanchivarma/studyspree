import { characterSlugs, type CharacterDefinition } from "@/types/characters";

export const characters: readonly CharacterDefinition[] = characterSlugs.map((slug, index) => ({
  slug,
  presentation: index < 4 ? "male" : "female",
  nameKey: `characters.${slug}`,
  descriptionKey: index % 2 === 0 ? "characters.reading" : "characters.writing",
  activity: index % 2 === 0 ? "reading" : "writing",
  gif: `/characters/${slug}/study-v1.gif`,
  poster: `/characters/${slug}/poster-v1.webp`,
  webm: null,
  mp4: null,
  assetVersion: "v1",
  licenceId: `studyspree-original-${slug}-v1`,
}));

export function getCharacter(slug: string): CharacterDefinition | null {
  return characters.find(character => character.slug === slug) ?? null;
}
