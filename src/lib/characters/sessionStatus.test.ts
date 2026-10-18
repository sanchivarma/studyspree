import { describe, expect, it } from "vitest";
import { characters } from "./registry";
import { characterSessionStatus, characterStatusOptions, generalStatusKeys } from "./sessionStatus";
import { locales, translate } from "@/translations";

describe("virtual partner session statuses", () => {
  it("has fifty general statuses and dedicated historical pools in all languages", () => {
    expect(generalStatusKeys).toHaveLength(50);
    for (const { slug } of characters) for (const locale of locales) {
      const options = characterStatusOptions(slug);
      const strings = options.map(key => translate(locale, key));
      expect(new Set(strings).size).toBe(options.length);
      for (const [index, text] of strings.entries()) expect(text).not.toBe(options[index]);
    }
    for (const slug of ["einstein", "tesla", "medieval-scholar", "medieval-scribe"] as const) {
      expect(characterStatusOptions(slug)).toHaveLength(10);
      expect(characterStatusOptions(slug).some(key => generalStatusKeys.includes(key))).toBe(false);
    }
  });
  it("rotates without repeats until the pool wraps, independently of random IDs", () => {
    for (const { slug } of characters) {
      const size = characterStatusOptions(slug).length;
      const cycle = Array.from({ length: size }, (_, index) => characterSessionStatus(`id-${index}`, slug, index));
      expect(new Set(cycle).size).toBe(size);
      expect(characterSessionStatus("next-id", slug, size)).toBe(cycle[0]);
      expect(characterSessionStatus("refresh-id", slug, 0)).toBe(cycle[0]);
    }
  });
  it("keeps each status stable through refresh and selection changes", () => {
    for (const { slug } of characters) expect(characterSessionStatus("session-one", slug)).toBe(characterSessionStatus("session-one", slug));
  });
  it("varies between sessions and supplies a status for every partner", () => {
    for (const { slug } of characters) {
      const statuses = new Set(Array.from({ length: 20 }, (_, n) => characterSessionStatus(`session-${n}`, slug)));
      expect(statuses.size).toBeGreaterThan(1);
      for (const status of statuses) expect(status).toMatch(/^characters\.status/);
    }
  });
  it("uses suitable fictional tasks for historical and whimsical companions", () => {
    for (const slug of ["einstein", "tesla", "medieval-scholar", "medieval-scribe", "moss-fox", "pip-owl", "momo-cloud"] as const) {
      for (let n = 0; n < 10; n++) expect(characterSessionStatus(`session-${n}`, slug)).toMatch(/^characters\.status/);
    }
  });
});
