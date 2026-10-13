import { redirect } from "next/navigation";
import { StartScreen } from "@/components/start/StartScreen";
import { authRepository } from "@/lib/repo/authRepository";
import { now } from "@/lib/clock";

export default async function StudyPage() {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  return <StartScreen displayName={profile.username} initialHour={now().getHours()} />;
}
