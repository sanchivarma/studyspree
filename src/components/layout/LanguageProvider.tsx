"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveLanguage } from "@/app/languageActions";
import type { Dictionary, Locale, TranslationKey } from "@/translations/locale";
import { formatTranslation } from "@/translations/format";
import { loadDictionary } from "@/translations/load";

export const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
} | null>(null);

export function LanguageProvider({ children, initialLocale, initialDictionary }: { children: React.ReactNode; initialLocale: Locale; initialDictionary: Dictionary }) {
  const [{ locale, dictionary }, updateLanguage] = useState({ locale: initialLocale, dictionary: initialDictionary });
  const latest = useRef(0);
  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => formatTranslation(dictionary, key, params), [dictionary]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = "StudySpree";
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("common.tagline"));
  }, [locale, t]);

  const setLocale = useCallback((nextLocale: Locale) => {
    const request = ++latest.current;
    void loadDictionary(nextLocale).then(nextDictionary => {
      if (request !== latest.current) return;
      updateLanguage({ locale: nextLocale, dictionary: nextDictionary });
      void saveLanguage(nextLocale).catch(() => { /* Keep the selected language if persistence is unavailable. */ });
    }).catch(() => { /* Retain the current complete dictionary if a language chunk cannot load. */ });
  }, []);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
