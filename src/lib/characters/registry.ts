import { humanCharacterSlugs, realisticCharacterSlugs, type CharacterDefinition } from "@/types/characters";

const backgrounds = ["southAsian", "eastAsian", "blackAfrican", "mena", "latinAmerican", "european", "southeastAsian", "mixedHeritage", "centralAsian", "pacificIslander", "andean", "afroCaribbean"] as const;
const realisticVersion = (index: number) => index >= 8 ? "v1" : index === 1 ? "v4" : "v3";

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
})), ...realisticCharacterSlugs.map((slug, index): CharacterDefinition => ({
  slug, presentation: [0, 3, 5, 6, 8, 11].includes(index) ? "male" : "female", style: "realistic", nameKey: `characters.${slug}`,
  descriptionKey: index === 1 || index >= 8 ? "characters.realisticWriting" : "characters.realisticReading", backgroundKey: `characters.${backgrounds[index]}`,
  activity: index === 1 || index >= 8 ? "writing" : "reading", gif: `/characters/${slug}/study-${realisticVersion(index)}.gif`,
  poster: `/characters/${slug}/poster-${realisticVersion(index)}.webp`, webm: null, mp4: null, loopSeconds: index >= 8 ? 5.3 : index === 1 ? 5.45 : 5.02,
  assetVersion: realisticVersion(index), licenceId: `studyspree-ai-${slug}-${realisticVersion(index)}`,
}))];

export function getCharacter(slug: string): CharacterDefinition | null {
  return characters.find(character => character.slug === slug) ?? null;
}
