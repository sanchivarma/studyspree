import type english from "./en";

export const locales = ["en", "de", "fr", "pl", "it"] as const;
export type Locale = (typeof locales)[number];
export type Dictionary = typeof english;
export type TranslationKey = {
  [Namespace in keyof Dictionary]: `${Namespace}.${keyof Dictionary[Namespace] & string}`
}[keyof Dictionary];

export const languageNames: Record<Locale, string> = {
  en: "English", de: "Deutsch", fr: "Français", pl: "Polski", it: "Italiano",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.some(locale => locale === value);
}
