import { describe, expect, it } from "vitest";
import { characters, getCharacter } from "./registry";
import { characterSlugs } from "@/types/characters";
import { companionSchema, localCompanionSchema } from "./schemas";

describe("virtual companion definitions", () => {
  it("defines four male and four female original partners independently of themes", () => {
    const illustrated = characters.filter(value => value.style === "illustrated");
    expect(illustrated).toHaveLength(8);
    expect(illustrated.filter(value => value.presentation === "male")).toHaveLength(4);
    expect(illustrated.filter(value => value.presentation === "female")).toHaveLength(4);
    expect(new Set(illustrated.map(value => value.gif)).size).toBe(8);
    expect(getCharacter("rain-desk")).toBeNull();
    for (const character of illustrated) expect(character.gif).toBe(`/characters/${character.slug}/study-v3.gif`);
  });
  it("supports mixed styles, long illustrated loops and twelve realistic studying GIFs", () => {
    expect(characters.filter(value => value.style === "whimsical")).toHaveLength(3);
    for (const value of characters.filter(value => value.style === "illustrated" || value.style === "whimsical")) {
      expect(value.loopSeconds).toBe(150); expect(value.webm).toMatch(/study-v3\.webm$/);
    }
    const realistic = characters.filter(value => value.style === "realistic");
    expect(realistic).toHaveLength(12);
    expect(new Set(realistic.map(value => value.backgroundKey)).size).toBe(12);
    expect(realistic.filter(value => value.presentation === "male")).toHaveLength(6);
    expect(realistic.filter(value => value.presentation === "female")).toHaveLength(6);
    for (const value of realistic) {
      // Writers never receive a reading hold. Readers turn after staggered gaps.
      expect(value.assetVersion).toBe(value.slug === "realistic-01" ? "v13" : "v12");
      expect(value.loopSeconds).toBeGreaterThanOrEqual(10);
      expect(value.loopSeconds).toBeLessThanOrEqual(15);
      expect(value.webm).toBeNull();
      expect(value.gif).toBe(`/characters/${value.slug}/study-${value.assetVersion}.gif`);
      expect(value.descriptionKey).toMatch(/realistic(Reading|Writing)$/);
    }
    expect(companionSchema.safeParse({ mode: "characters", characterSlugs: ["female-01", "moss-fox", "realistic-01", "realistic-09", "realistic-10", "realistic-11", "realistic-12"] }).success).toBe(true);
  });
  it("includes four historical studying loops with separate identities", () => {
    const historical = characters.filter(value => value.style === "historical");
    expect(historical.map(value => value.slug)).toEqual(["medieval-scholar", "medieval-scribe", "einstein", "tesla"]);
    expect(historical.find(value => value.slug === "medieval-scribe")?.presentation).toBe("female");
    expect(historical.find(value => value.slug === "medieval-scholar")?.presentation).toBe("male");
    expect(new Set(historical.map(value => value.gif)).size).toBe(4);
    expect(getCharacter("tesla")).toMatchObject({ assetVersion: "v24", loopSeconds: 13, webm: "/characters/tesla/study-v24.webm" });
    expect(getCharacter("einstein")?.webm).toBe("/characters/einstein/study-v24.webm");
    expect(companionSchema.safeParse({ mode: "characters", characterSlugs: historical.map(value => value.slug) }).success).toBe(true);
  });
  it("accepts the complete known cast for paginated sessions", () => {
    expect(companionSchema.safeParse({ mode: "characters", characterSlugs: [...characterSlugs] }).success).toBe(true);
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
