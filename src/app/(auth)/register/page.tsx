import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { getAuthConfig, isLocalAuth } from "@/lib/auth/config";
import { authRepository } from "@/lib/repo/authRepository";

export default async function RegisterPage() {
  const profile = await authRepository.getProfile();
  if (profile) redirect(profile.onboarding_complete ? "/" : "/onboarding");
  return <AuthScreen isConfigured={Boolean(getAuthConfig())} allowOAuth={!isLocalAuth()} initialMode="register" />;
}
