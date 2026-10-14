import type { CSSProperties } from "react";
import { AppContent } from "@/components/layout/AppContent";
import { AppNav } from "@/components/layout/AppNav";
import { getTheme } from "@/lib/themes/registry";
import { authRepository } from "@/lib/repo/authRepository";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  const theme = getTheme(profile.selected_theme);
  const style = { "--accent": theme.accentColor } as CSSProperties;

  return (
    <div style={style}>
      <AppNav showStreak={profile.show_streak} />
      <AppContent>{children}</AppContent>
    </div>
  );
}
