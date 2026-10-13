import type { CSSProperties } from "react";
import { AppContent } from "@/components/layout/AppContent";
import { AppNav } from "@/components/layout/AppNav";
import { getCharacter } from "@/lib/characters/registry";
import { authRepository } from "@/lib/repo/authRepository";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  const character = getCharacter(profile.selected_character);
  const style = { "--accent": character.accentColor } as CSSProperties;

  return (
    <div style={style}>
      <AppNav showStreak={profile.show_streak} />
      <AppContent>{children}</AppContent>
    </div>
  );
}
