import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { getAuthConfig, isLocalAuth } from "@/lib/auth/config";
import { authRepository } from "@/lib/repo/authRepository";
import { hasDevAdmin } from "@/lib/auth/devAdmin";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ authError?: string; invite?: string }> }) {
  const profile = await authRepository.getProfile();
  if (profile) redirect(profile.onboarding_complete ? "/" : "/onboarding");
  const params = await searchParams;
  return <AuthScreen key={params.invite === "1" ? "invitation" : "default"} isConfigured={Boolean(getAuthConfig())} allowOAuth={!isLocalAuth()} hasDevLogin={hasDevAdmin()} hasCallbackError={params.authError === "1"} initialMode={params.invite === "1" ? "register" : "login"} />;
}
