import { describe, expect, it } from "vitest";
import { comebackDaysAway } from "./comeback";
import type { Profile, Session } from "@/types/domain";

const profile: Profile = { mirrorSelfView:true,showOwnTile:true,shareNowPlaying:false,leaderboardOptIn:false, displayName: "Alex", selectedTheme: "rain-desk", timezone: "Europe/Berlin", showStreak: true, reduceMotion: false, webcamEnabled: false, webcamCorner: "bottom-right", ambienceEnabled: false, musicTrack: null, musicVolume: 0, roomVolume: 0, comebackShownForDate: null, companionPreferences: { mode: "solo", characterSlugs: [] } };
const session: Session = { id: "prior", startedAt: "2026-10-10T12:00:00Z", endedAt: "2026-10-10T12:25:00Z", localDate: "2026-10-10", actualSeconds: 1500, plannedMinutes: 25, themeSlug: "rain-desk", endedReason: "completed", task: null, companions: { mode: "solo", characterSlugs: [] } };
describe("comeback calendar eligibility", () => {
  it.each([["2026-10-10", null], ["2026-10-12", null], ["2026-10-13", 3], ["2026-10-20", 10], ["2026-10-09", null]])("checks %s without timestamp arithmetic", (today, expected) => {
    expect(comebackDaysAway(session, today, profile)).toBe(expected);
  });
  it("needs prior ended activity and respects today's marker", () => {
    expect(comebackDaysAway(undefined, "2026-10-14", profile)).toBeNull();
    expect(comebackDaysAway({ ...session, endedAt: null }, "2026-10-14", profile)).toBeNull();
    expect(comebackDaysAway(session, "2026-10-14", { ...profile, comebackShownForDate: "2026-10-14" })).toBeNull();
    expect(comebackDaysAway(session, "2026-10-15", { ...profile, comebackShownForDate: "2026-10-14" })).toBe(5);
  });
  it.each([["2026-03-27", "2026-03-30"], ["2026-10-23", "2026-10-26"], ["2026-12-30", "2027-01-02"]])("handles calendar boundaries %s to %s", (last, today) => {
    expect(comebackDaysAway({ ...session, localDate: last }, today, profile)).toBe(3);
  });
});
