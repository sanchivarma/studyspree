"use client";

import { createContext, useEffect, useState } from "react";
import { saveLanguage } from "@/app/languageActions";
import { translate, type Locale, type TranslationKey } from "@/translations";

export const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
} | null>(null);

export function LanguageProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [locale, updateLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = "StudySpree";
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(locale, "common.tagline"));
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    updateLocale(nextLocale);
    void saveLanguage(nextLocale).catch(() => { /* The selected language still works without a saved preference. */ });
  };

  return <LanguageContext.Provider value={{ locale, setLocale, t: (key, params) => translate(locale, key, params) }}>{children}</LanguageContext.Provider>;
}
