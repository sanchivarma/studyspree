"use client";

import { useProfile } from "./useProfile";
import { useProfileMutation } from "./useProfileMutation";
import { soloCompanions } from "@/lib/characters/schemas";
import type { CompanionPreferences } from "@/types/characters";

export function useCompanionPreferences() {
  const profile = useProfile();
  const mutation = useProfileMutation((companionPreferences: CompanionPreferences) => ({ companionPreferences }));
  return { value: profile.data?.companionPreferences ?? soloCompanions(), mutation };
}
