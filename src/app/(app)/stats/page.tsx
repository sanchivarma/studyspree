import { redirect } from "next/navigation";
import { StatsScreen } from "@/components/stats/StatsScreen";
import { authRepository } from "@/lib/repo/authRepository";
import { mockDayStats, mockSessions, mockStatsSummary, MOCK_REFERENCE_DATE } from "@/lib/mock/stats";

export default async function StatsPage() {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  return <StatsScreen days={mockDayStats} sessions={mockSessions} summary={mockStatsSummary} referenceDate={MOCK_REFERENCE_DATE} showStreak={profile.show_streak} />;
}
