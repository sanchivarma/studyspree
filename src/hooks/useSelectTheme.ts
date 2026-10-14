"use client";

import { useProfileMutation } from "@/hooks/useProfileMutation";
import type { ThemeSlug } from "@/lib/themes/registry";

export function useSelectTheme() {
  return useProfileMutation((selectedTheme: ThemeSlug) => ({ selectedTheme }));
}
