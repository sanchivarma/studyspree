import type { CSSProperties } from "react";
import { AppContent } from "@/components/layout/AppContent";
import { AppNav } from "@/components/layout/AppNav";
import { getTheme } from "@/lib/themes/registry";
import { authRepository } from "@/lib/repo/authRepository";
import { redirect } from "next/navigation";
import { getDevAdminProfile } from "@/lib/auth/devAdmin";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarding_complete) redirect("/onboarding");
  const theme = getTheme(profile.selected_theme);
  const style = { "--accent": theme.accentColor } as CSSProperties;

  return (
    <div style={style} data-repository-mode={await getDevAdminProfile() ? "local" : "server"}>
      <AppNav showStreak={profile.show_streak} />
      <AppContent>{children}</AppContent>
    </div>
  );
}
