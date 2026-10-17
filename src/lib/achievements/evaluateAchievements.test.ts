import { expect, it } from "vitest";
import { evaluateAchievements } from "./evaluateAchievements";
import { achievementDefinitions } from "./registry";
it("awards all kinds at boundaries, keeps earlier awards and deduplicates replay", () => {
  for (const d of achievementDefinitions) {
    const facts = { bestStreak: 0, totalSeconds: 0, sessionCount: 0 };
    const key = d.kind === "streak" ? "bestStreak" : d.kind === "study-seconds" ? "totalSeconds" : "sessionCount";
    facts[key] = d.threshold - 1; expect(evaluateAchievements(facts, new Set(), [d])).toEqual([]);
    facts[key]++; expect(evaluateAchievements(facts, new Set(), [d])).toEqual([d.id]);
    expect(evaluateAchievements(facts, new Set([d.id]), [d])).toEqual([]);
  }
  expect(evaluateAchievements({ bestStreak: 7, totalSeconds: 36000, sessionCount: 10 }, new Set(), achievementDefinitions).length).toBeGreaterThan(3);
  expect(evaluateAchievements({ bestStreak: 0, totalSeconds: 0, sessionCount: 0 }, new Set(["streak-7"]), achievementDefinitions)).toEqual([]);
});
