import "server-only";

import { profileSchema, type OnboardingInput } from "@/lib/auth/schemas";
import type { createAuthClient } from "@/lib/auth/server";

type Client = Awaited<ReturnType<typeof createAuthClient>>;
export async function readAccount(client: Client) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const response = await client.from("profiles").select("*").eq("id", data.user.id).single();
  const parsed = profileSchema.safeParse(response.data);
  return parsed.success ? parsed.data : null;
}
export async function completeOnboarding(client: Client, input: OnboardingInput) {
  const identity = await client.auth.getUser();
  if (identity.error || !identity.data.user) return false;
  const response = await client.from("profiles").update({ display_name: input.displayName, timezone: input.timezone,
    selected_theme: input.selectedTheme, show_streak: input.showStreak, reduce_motion: input.reduceMotion,
    webcam_enabled: false, ambience_enabled: false, onboarding_complete: true }).eq("id", identity.data.user.id).select("id").single();
  return !response.error && Boolean(response.data);
}
