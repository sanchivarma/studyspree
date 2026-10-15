import { redirect } from "next/navigation";
import { authRepository } from "@/lib/repo/authRepository";
import { OnboardingScreen } from "@/components/auth/OnboardingScreen";

export default async function OnboardingPage() {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/login");
  if (profile.onboarding_complete) redirect("/");
  return <OnboardingScreen profile={profile} />;
}
