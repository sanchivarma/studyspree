import { redirect } from "next/navigation";
import { CompleteScreen } from "@/components/session/CompleteScreen";
import { authRepository } from "@/lib/repo/authRepository";

export default async function CompletePage() {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  return <CompleteScreen slug={profile.selected_character} />;
}
