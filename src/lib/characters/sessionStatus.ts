import type { CharacterSlug } from "@/types/characters";
import type { TranslationKey } from "@/translations";

export const generalStatusKeys = Array.from({ length: 50 }, (_, index) => `characters.statusGeneral${String(index + 1).padStart(2, "0")}` as TranslationKey);
const bank = (prefix: string) => Array.from({ length: 10 }, (_, index) => `characters.status${prefix}${String(index + 1).padStart(2, "0")}` as TranslationKey);
const themed: Partial<Record<CharacterSlug, readonly TranslationKey[]>> = {
  einstein: bank("Einstein"),
  tesla: bank("Tesla"),
  "moss-fox": ["characters.statusFox", "characters.statusOnePage", "characters.statusChapter", "characters.statusSmallSteps", "characters.statusPractice"],
  "pip-owl": ["characters.statusOwl", "characters.statusNotes", "characters.statusChapter", "characters.statusOnePage", "characters.statusDeadline"],
  "momo-cloud": ["characters.statusCloud", "characters.statusSmallSteps", "characters.statusOnePage", "characters.statusNotes", "characters.statusPractice"],
};

export const characterStatusOptions = (slug: CharacterSlug): readonly TranslationKey[] => themed[slug] ?? generalStatusKeys;

// Session identity, rather than a render-time random choice, keeps each virtual
// partner's fictional study status stable across refreshes and tile changes.
export function characterSessionStatus(sessionId: string, slug: CharacterSlug, cycle?: number): TranslationKey {
  let hash = 2166136261;
  for (const code of cycle === undefined ? `${sessionId}:${slug}` : slug) hash = Math.imul(hash ^ code.charCodeAt(0), 16777619) >>> 0;
  const choices = characterStatusOptions(slug);
  return choices[(hash % choices.length + (cycle ?? 0)) % choices.length];
}
