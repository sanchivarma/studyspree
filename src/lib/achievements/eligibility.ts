import { z } from "zod";
import { achievementDefinitions } from "./registry";
// Streak badge milestones shown in the supplied reference screens.
export const streakMilestones = achievementDefinitions.filter(definition => definition.kind === "streak").map(definition => definition.threshold);
export const awardSchema = z.object({ milestone: z.number().refine(value => streakMilestones.some(n => n === value)), earnedAt: z.iso.datetime({ offset: true }) }).strict();
export type Award = z.infer<typeof awardSchema>;
/** Pure and monotonic: resetting a current streak never revokes an award. */
export function eligibleMilestones(bestStreak: number): number[] {
    if (!Number.isSafeInteger(bestStreak) || bestStreak < 0)
        throw new Error("Invalid streak");
    return streakMilestones.filter(value => value <= bestStreak);
}
export function awardMilestones(existing: Award[], bestStreak: number, earnedAt: string): Award[] {
    const awards = z.array(awardSchema).parse(existing);
    const known = new Set(awards.map(award => award.milestone));
    for (const milestone of eligibleMilestones(bestStreak))
        if (!known.has(milestone))
            awards.push(awardSchema.parse({ milestone, earnedAt }));
    return awards.sort((a, b) => a.milestone - b.milestone);
}
