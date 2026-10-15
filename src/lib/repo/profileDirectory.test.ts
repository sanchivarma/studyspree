import { describe, expect, it } from "vitest";
import { LocalRepository } from "./local";
describe("local profile contract", () => {
  it("persists editing without changing study accounting or publishing", async () => {
    const values = new Map<string,string>(); const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string,value: string) => { values.set(key,value); }, removeItem: (key: string) => { values.delete(key); } };
    const repository = new LocalRepository(() => storage);
    const session = await repository.startSession({ plannedMinutes: 5, themeSlug: "rain-desk", task: null });
    const original = await repository.getDirectoryProfile();
    const edited = await repository.updateDirectoryProfile({ displayName: "Reader", bio: "Books", countryCode: "DE", occupation: "Student", interests: ["Math"], lookingFor: [], socials: [], isPublic: true });
    expect(edited.isPublic).toBe(false); expect(edited.isLocal).toBe(true);
    expect((await repository.getProfile()).displayName).toBe("Reader");
    expect((await new LocalRepository(() => storage).getDirectoryProfile()).bio).toBe("Books");
    expect((await repository.getDirectoryProfile()).joinedAt).toBe(original.joinedAt);
    expect(await repository.getActiveSession()).toEqual(session);
    expect(await repository.getTotalSecondsAllTime()).toBe(0);
  });
  it("repairs corrupt preview JSON without throwing", async () => {
    const storage = { getItem: () => "{bad", setItem: () => {}, removeItem: () => {} };
    const profile = await new LocalRepository(() => storage).getDirectoryProfile();
    expect(profile.isPublic).toBe(false); expect(profile.interests).toEqual([]);
  });
});
