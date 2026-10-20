import { redirect } from "next/navigation";
import { StartScreen } from "@/components/start/StartScreen";
import { authRepository } from "@/lib/repo/authRepository";
import { now } from "@/lib/clock";

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  const { mode } = await searchParams;
  return <StartScreen displayName={profile.username} initialHour={now().getHours()} initialMode={mode === "solo" || mode === "characters" || mode === "people" ? mode : undefined} />;
}
