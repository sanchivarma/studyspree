import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { LanguageContext } from "@/components/layout/LanguageProvider";
import { translate, type TranslationKey } from "@/translations";
import { StreakCard } from "./StreakCard";

it("shows Ready when you are for zero streaks without printing 0 days", () => {
  const html = renderToStaticMarkup(createElement(LanguageContext.Provider, { value: {
    locale: "en", setLocale: () => {}, t: (key: TranslationKey, params?: Record<string, string | number>) => translate("en", key, params),
  } }, createElement(StreakCard, { today: "2026-10-13", streak: { current: 0, best: 0, lastActiveDate: null, freezesRemaining: 2, freezesResetAt: "2026-11-01" } })));
  expect(html).toContain("Ready when you are");
  expect(html).not.toContain("0 days");
  expect(html).toContain("Freezes left");
});
