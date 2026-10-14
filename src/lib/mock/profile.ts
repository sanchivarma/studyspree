import type { ThemeSlug } from "@/lib/themes/registry";

export type MockProfile = {
  displayName: string;
  selectedTheme: ThemeSlug;
  showStreak: boolean;
};

export const mockProfile: MockProfile = {
  displayName: "Sanchi",
  selectedTheme: "rain-desk",
  showStreak: true,
};
