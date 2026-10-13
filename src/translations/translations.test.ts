import { describe, expect, it } from "vitest";
import { dictionaries, isLocale, locales, translate, type TranslationKey } from "./index";

function flatten(dictionary: typeof dictionaries.en): Record<string, string> {
  return Object.fromEntries(Object.entries(dictionary).flatMap(([namespace, values]) => Object.entries(values).map(([key, value]) => [`${namespace}.${key}`, value])));
}

describe("translations", () => {
  it.each(locales)("provides every nonempty text and matching placeholders in %s", (locale) => {
    const english = flatten(dictionaries.en);
    const current = flatten(dictionaries[locale]);
    expect(Object.keys(current).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      expect(current[key].trim().length).toBeGreaterThan(0);
      expect(current[key].match(/\{\w+\}/g)).toEqual(english[key].match(/\{\w+\}/g));
    }
  });
  it("uses the actual username and selected language", () => {
    expect(translate("de", "home.morning", { username: "alex_123" })).toBe("Guten Morgen, alex_123.");
    expect(translate("it", "study.minutes", { count: 25 })).toBe("25 min");
  });
  it("rejects unknown locale values", () => {
    expect(isLocale("xx")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale("fr")).toBe(true);
  });
  it("does not crash for missing runtime keys", () => {
    expect(translate("en", "missing.key" as TranslationKey)).toBe("missing.key");
    expect(translate("en", "tagline" as TranslationKey)).toBe("tagline");
  });
  it("uses the requested tagline", () => {
    expect(translate("en", "common.tagline")).toBe("Big goals start with showing up");
  });
});
