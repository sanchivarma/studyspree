import { soloCompanions } from "@/lib/characters/schemas";
import type { Profile } from "@/types/domain";

/** Session choices reset; identity, accessibility and earned study data remain. */
export function freshSessionSelections() {
  return {
    companionPreferences: soloCompanions(),
  } satisfies Partial<Profile>;
}
