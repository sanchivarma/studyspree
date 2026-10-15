import "server-only";
import { authRepository } from "@/lib/repo/authRepository";

export async function authenticatedDestination() {
  const profile = await authRepository.getProfile();
  return profile ? profile.onboarding_complete ? "/" : "/onboarding" : "/login?authError=1";
}
