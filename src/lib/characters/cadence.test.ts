import { describe, expect, it } from "vitest";
import revisions from "./mediaRevisions.json";
import { characters } from "./registry";

describe("study activity cadence", () => {
  it("keeps writing active without inserting a reading-pose pause", () => {
    for (const character of characters.filter(c => (c.style === "realistic" || c.style === "historical") && c.activity === "writing")) {
      const revision = revisions[character.slug as keyof typeof revisions];
      expect(revision, character.slug).toHaveProperty("readingPauseMs", 0);
      expect(revision, character.slug).toHaveProperty("gifDelays");
      const delays = Reflect.get(revision, "gifDelays") as number[];
      expect(Math.max(...delays), character.slug).toBeLessThanOrEqual(130);
      expect(character.loopSeconds, character.slug).toBeGreaterThanOrEqual(10);
      expect(character.loopSeconds, character.slug).toBeLessThanOrEqual(15);
    }
  });
  it("spaces the realistic readers’ page-turn onsets independently", () => {
    const starts = characters.filter(c => c.style === "realistic" && c.activity === "reading").map(c => Reflect.get(revisions[c.slug as keyof typeof revisions], "readingPauseMs") as number);
    expect(new Set(starts).size).toBe(starts.length);
    for (const onset of starts) { expect(onset).toBeGreaterThanOrEqual(10000); expect(onset).toBeLessThan(12000); }
  });
});
