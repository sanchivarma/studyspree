import { describe, expect, it } from "vitest";
import { characters, getCharacter } from "./registry";
import { companionSchema, localCompanionSchema } from "./schemas";

describe("virtual companion definitions", () => {
  it("defines four male and four female original partners independently of themes", () => {
    const illustrated = characters.filter(value => value.style === "illustrated");
    expect(illustrated).toHaveLength(8);
    expect(illustrated.filter(value => value.presentation === "male")).toHaveLength(4);
    expect(illustrated.filter(value => value.presentation === "female")).toHaveLength(4);
    expect(new Set(illustrated.map(value => value.gif)).size).toBe(8);
    expect(getCharacter("rain-desk")).toBeNull();
    for (const character of illustrated) expect(character.gif).toBe(`/characters/${character.slug}/study-v1.gif`);
  });
  it("supports mixed styles, long illustrated loops and eight realistic studying GIFs", () => {
    expect(characters.filter(value => value.style === "whimsical")).toHaveLength(3);
    for (const value of characters.filter(value => value.style !== "realistic")) {
      expect(value.loopSeconds).toBe(150); expect(value.webm).toMatch(/study-v2\.webm$/);
    }
    const realistic = characters.filter(value => value.style === "realistic");
    expect(realistic).toHaveLength(8);
    expect(new Set(realistic.map(value => value.backgroundKey)).size).toBe(8);
    expect(realistic.filter(value => value.presentation === "male")).toHaveLength(4);
    expect(realistic.filter(value => value.presentation === "female")).toHaveLength(4);
    for (const value of realistic) {
      expect(value.loopSeconds).toBe(value.slug === "realistic-02" ? 5.45 : 5.02); expect(value.webm).toBeNull(); expect(value.gif).toMatch(/study-v[34]\.gif$/);
      expect(value.descriptionKey).toMatch(/realistic(Reading|Writing)$/);
    }
    expect(companionSchema.safeParse({ mode: "characters", characterSlugs: ["female-01", "moss-fox", "realistic-01"] }).success).toBe(true);
  });
  it("rejects unknown, duplicate, empty and mode-inconsistent selections", () => {
    for (const input of [
      { mode: "characters", characterSlugs: [] },
      { mode: "solo", characterSlugs: ["male-01"] },
      { mode: "characters", characterSlugs: ["male-01", "male-01"] },
      { mode: "characters", characterSlugs: ["rain-desk"] },
    ]) expect(companionSchema.safeParse(input).success).toBe(false);
    expect(companionSchema.parse({ mode: "characters", characterSlugs: ["male-01", "female-04"] }).characterSlugs).toHaveLength(2);
    expect(localCompanionSchema.safeParse({ mode: "people", characterSlugs: [] }).success).toBe(false);
  });
});
