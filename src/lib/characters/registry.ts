import { humanCharacterSlugs, realisticCharacterSlugs, historicalCharacterSlugs, type CharacterSlug, type CharacterDefinition } from "@/types/characters";

import mediaRevisions from "./mediaRevisions.json";
type MediaRevision = { version: string; posterVersion: string; loopSeconds: number; video: boolean };
const revisions: Partial<Record<CharacterSlug, MediaRevision>> = mediaRevisions;
const versionFor = (slug: CharacterSlug, fallback: string) => revisions[slug]?.version ?? fallback;

const backgrounds = ["southAsian", "eastAsian", "blackAfrican", "mena", "latinAmerican", "european", "southeastAsian", "mixedHeritage", "centralAsian", "pacificIslander", "andean", "afroCaribbean"] as const;
const realisticVersion = (index: number) => versionFor(realisticCharacterSlugs[index], index >= 8 ? "v1" : index === 1 ? "v4" : "v3");

export const characters: readonly CharacterDefinition[] = [...humanCharacterSlugs.map((slug, index): CharacterDefinition => ({
  slug,
  presentation: index < 4 ? "male" : "female",
  style: "illustrated",
  nameKey: `characters.${slug}`,
  descriptionKey: index % 2 === 0 ? "characters.reading" : "characters.writing",
  activity: index % 2 === 0 ? "reading" : "writing",
  gif: `/characters/${slug}/study-v3.gif`,
  poster: `/characters/${slug}/poster-v1.webp`,
  webm: `/characters/${slug}/study-v3.webm`,
  mp4: `/characters/${slug}/study-v3.mp4`,
  loopSeconds: 150,
  assetVersion: "v3",
  licenceId: `studyspree-original-${slug}-v3`,
})), ...(["moss-fox", "pip-owl", "momo-cloud"] as const).map((slug): CharacterDefinition => ({
  slug, presentation: "neutral", style: "whimsical", nameKey: `characters.${slug}`,
  descriptionKey: "characters.reading", activity: "reading", gif: `/characters/${slug}/study-v3.gif`,
  poster: `/characters/${slug}/poster-v1.webp`, webm: `/characters/${slug}/study-v3.webm`, mp4: `/characters/${slug}/study-v3.mp4`,
  loopSeconds: 150, assetVersion: "v3", licenceId: `studyspree-original-${slug}-v3`,
})), ...realisticCharacterSlugs.map((slug, index): CharacterDefinition => ({
  slug, presentation: [0, 3, 5, 6, 8, 11].includes(index) ? "male" : "female", style: "realistic", nameKey: `characters.${slug}`,
  descriptionKey: index === 1 || index >= 8 ? "characters.realisticWriting" : "characters.realisticReading", backgroundKey: `characters.${backgrounds[index]}`,
  activity: index === 1 || index >= 8 ? "writing" : "reading", gif: `/characters/${slug}/study-${realisticVersion(index)}.gif`,
  poster: `/characters/${slug}/poster-${revisions[slug]?.posterVersion ?? realisticVersion(index)}.webp`, webm: revisions[slug]?.video ? `/characters/${slug}/study-${realisticVersion(index)}.webm` : null, mp4: revisions[slug]?.video ? `/characters/${slug}/study-${realisticVersion(index)}.mp4` : null, loopSeconds: revisions[slug]?.loopSeconds ?? (index >= 8 ? 5.3 : index === 1 ? 5.45 : 5.02),
  assetVersion: realisticVersion(index), licenceId: `studyspree-ai-${slug}-${realisticVersion(index)}`,
})), ...historicalCharacterSlugs.map((slug): CharacterDefinition => ({
  slug, presentation: slug === "medieval-scribe" ? "female" : "male", style: "historical",
  nameKey: `characters.${slug}`, descriptionKey: `characters.${slug}Description`,
  activity: slug === "medieval-scribe" ? "reading" : "writing",
  gif: `/characters/${slug}/study-${versionFor(slug, slug === "tesla" ? "v5" : "v1")}.gif`, poster: `/characters/${slug}/poster-${revisions[slug]?.posterVersion ?? (slug === "tesla" ? "v5" : "v1")}.webp`,
  webm: (revisions[slug]?.video ?? slug === "tesla") ? `/characters/${slug}/study-${versionFor(slug, "v5")}.webm` : null,
  mp4: (revisions[slug]?.video ?? slug === "tesla") ? `/characters/${slug}/study-${versionFor(slug, "v5")}.mp4` : null,
  loopSeconds: revisions[slug]?.loopSeconds ?? (slug === "tesla" ? 20 : 5.3), assetVersion: versionFor(slug, slug === "tesla" ? "v5" : "v1"), licenceId: `studyspree-ai-${slug}-${versionFor(slug, slug === "tesla" ? "v5" : "v1")}`,
}))];

export function getCharacter(slug: string): CharacterDefinition | null {
  return characters.find(character => character.slug === slug) ?? null;
}
