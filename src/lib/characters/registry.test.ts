import { describe, expect, it } from "vitest";
import { characters, getCharacter } from "./registry";
import { companionSchema, localCompanionSchema } from "./schemas";

describe("virtual companion definitions", () => {
  it("defines four male and four female original partners independently of themes", () => {
    expect(characters).toHaveLength(8);
    expect(characters.filter(value => value.presentation === "male")).toHaveLength(4);
    expect(characters.filter(value => value.presentation === "female")).toHaveLength(4);
    expect(new Set(characters.map(value => value.gif)).size).toBe(8);
    expect(getCharacter("rain-desk")).toBeNull();
    for (const character of characters) expect(character.gif).toBe(`/characters/${character.slug}/study-v1.gif`);
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
