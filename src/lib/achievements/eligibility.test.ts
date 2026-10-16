import { expect, it } from "vitest";
import { eligibleMilestones, awardMilestones, streakMilestones } from "./eligibility";
it("awards each milestone at its exact threshold", () => {
    for (const milestone of streakMilestones) {
        expect(eligibleMilestones(milestone - 1)).not.toContain(milestone);
        expect(eligibleMilestones(milestone)).toContain(milestone);
    }
    expect(eligibleMilestones(0)).toEqual([]);
    expect(() => eligibleMilestones(-1)).toThrow();
});
it("is idempotent, keeps original dates and never revokes earned badges", () => {
    const first = awardMilestones([], 7, "2026-10-15T12:00:00Z");
    expect(awardMilestones(first, 7, "2026-11-15T12:00:00Z")).toEqual(first);
    expect(awardMilestones(first, 0, "2026-11-15T12:00:00Z")).toEqual(first);
    expect(awardMilestones(first, 10, "2026-11-15T12:00:00Z")).toHaveLength(first.length + 1);
});
