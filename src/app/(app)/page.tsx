import { HomeScreen } from "@/components/start/HomeScreen";
import { authRepository } from "@/lib/repo/authRepository";
import { now } from "@/lib/clock";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/login");
  return <HomeScreen username={profile.display_name || profile.username} slug={profile.selected_theme} initialHour={now().getHours()} />;
}
