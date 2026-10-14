"use client";

import { useProfileMutation } from "@/hooks/useProfileMutation";
import type { CharacterSlug } from "@/lib/characters/registry";

export function useSelectCharacter() {
  return useProfileMutation((selectedCharacter: CharacterSlug) => ({ selectedCharacter }));
}
