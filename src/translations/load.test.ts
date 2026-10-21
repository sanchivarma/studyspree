import { expect, it } from "vitest";
import { dictionaries, locales, translate } from "./index";
import { loadDictionary } from "./load";
import { formatTranslation } from "./format";

it.each(locales)("loads the complete %s dictionary without changing its copy or placeholders", async locale => {
  const dictionary = await loadDictionary(locale);
  expect(dictionary).toEqual(dictionaries[locale]);
  expect(formatTranslation(dictionary, "home.morning", { username: "reader" })).toBe(translate(locale, "home.morning", { username: "reader" }));
  expect(loadDictionary(locale)).toBe(loadDictionary(locale));
});

it("retains English fallback text and leaves unknown keys safe", () => {
  const dictionary = { ...dictionaries.de, home: {} } as typeof dictionaries.en;
  expect(formatTranslation(dictionary, "home.morning", { username: "reader" }, dictionaries.en)).toBe("Good morning, reader.");
  expect(formatTranslation(dictionary, "missing.key" as Parameters<typeof formatTranslation>[1])).toBe("missing.key");
});
