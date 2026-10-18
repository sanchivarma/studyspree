import "server-only";
import { authRepository } from "@/lib/repo/authRepository";
import { consumeAuthReturnTo } from "./returnToServer";

export async function authenticatedDestination() {
  const profile = await authRepository.getProfile();
  return profile ? profile.onboarding_complete ? await consumeAuthReturnTo() : "/onboarding" : "/login?authError=1";
}
