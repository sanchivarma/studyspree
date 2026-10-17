export type AchievementDefinition = { id: string; nameKey: string; descriptionKey: string; kind: "streak" | "study-seconds" | "session-count"; threshold: number };
export type EarnedAchievement = { achievementId: string; earnedAt: string };
