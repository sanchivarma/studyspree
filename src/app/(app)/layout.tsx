import type { CSSProperties } from "react";
import { AppContent } from "@/components/layout/AppContent";
import { AppNav } from "@/components/layout/AppNav";
import { getCharacter } from "@/lib/characters/registry";
import { mockProfile } from "@/lib/mock/profile";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const character = getCharacter(mockProfile.selectedCharacter);
  const style = { "--accent": character.accentColor } as CSSProperties;

  return (
    <div style={style}>
      <AppNav showStreak={mockProfile.showStreak} />
      <AppContent>{children}</AppContent>
    </div>
  );
}
