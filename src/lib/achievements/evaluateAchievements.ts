import type { AchievementDefinition } from "@/types/achievements";
export function evaluateAchievements(facts: { bestStreak: number; totalSeconds: number; sessionCount: number }, earnedIds: ReadonlySet<string>, definitions: readonly AchievementDefinition[]): string[] {
  if (Object.values(facts).some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error("Invalid achievement facts");
  return definitions.filter(d => !earnedIds.has(d.id) && (d.kind === "streak" ? facts.bestStreak : d.kind === "study-seconds" ? facts.totalSeconds : facts.sessionCount) >= d.threshold).map(d => d.id);
}
