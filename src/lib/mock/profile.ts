import type { CharacterSlug } from "@/lib/characters/registry";

export type MockProfile = {
  displayName: string;
  selectedCharacter: CharacterSlug;
  showStreak: boolean;
};

export const mockProfile: MockProfile = {
  displayName: "Sanchi",
  selectedCharacter: "rain-desk",
  showStreak: true,
};
