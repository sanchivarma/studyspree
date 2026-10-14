import { redirect } from "next/navigation";
import { HomeScreen } from "@/components/start/HomeScreen";
import { authRepository } from "@/lib/repo/authRepository";
import { now } from "@/lib/clock";

export default async function HomePage() {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  return <HomeScreen username={profile.username} slug={profile.selected_theme} initialHour={now().getHours()} />;
}
