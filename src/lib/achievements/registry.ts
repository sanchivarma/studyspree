import type { AchievementDefinition } from "@/types/achievements";
import { streakMilestones } from "./eligibility";
export const achievementDefinitions: readonly AchievementDefinition[] = [
  ...streakMilestones.map(threshold => ({ id: `streak-${threshold}`, kind: "streak" as const, threshold, nameKey: "roadmap.streakBadge", descriptionKey: "roadmap.streakRequirement" })),
  ...[3600, 36000, 180000, 360000].map(threshold => ({ id: `seconds-${threshold}`, kind: "study-seconds" as const, threshold, nameKey: "roadmap.timeBadge", descriptionKey: "roadmap.timeRequirement" })),
  ...[1, 10, 50, 100].map(threshold => ({ id: `sessions-${threshold}`, kind: "session-count" as const, threshold, nameKey: "roadmap.sessionBadge", descriptionKey: "roadmap.sessionRequirement" })),
];
