import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { getAuthConfig, isLocalAuth } from "@/lib/auth/config";
import { authRepository } from "@/lib/repo/authRepository";
import { hasDevAdmin } from "@/lib/auth/devAdmin";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ authError?: string }> }) {
  const profile = await authRepository.getProfile();
  if (profile) redirect(profile.onboarding_complete ? "/" : "/onboarding");
  return <AuthScreen isConfigured={Boolean(getAuthConfig())} allowOAuth={!isLocalAuth()} hasDevLogin={hasDevAdmin()} hasCallbackError={(await searchParams).authError === "1"} />;
}
