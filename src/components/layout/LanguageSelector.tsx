"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { isLocale, languageNames, locales } from "@/translations/locale";

export function LanguageSelector() {
  const { locale, setLocale, t } = useTranslation();
  const selectRef = useRef<HTMLSelectElement>(null);
  return (
    <div role="group" aria-label={t("common.language")} className="flex items-center rounded-xl border border-border bg-surface/90 text-small">
      <button type="button" aria-label={t("common.language")} aria-haspopup="listbox" title={t("common.language")}
        onClick={() => { selectRef.current?.focus(); try { selectRef.current?.showPicker?.(); } catch { /* Focus works where native picker access is unavailable. */ } }}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-accent">
        <Globe aria-hidden="true" data-testid="language-globe" className="size-5 shrink-0" strokeWidth={2} />
      </button>
      <div className="relative min-w-0">
      <select ref={selectRef} data-testid="language-selector" aria-label={t("common.language")} value={locale} onChange={(event) => { if (isLocale(event.target.value)) setLocale(event.target.value); }} className="min-h-11 max-w-[124px] min-w-0 appearance-none rounded-lg bg-transparent pr-9 text-foreground">
        {locales.map((language) => <option key={language} value={language} className="bg-surface">{languageNames[language]}</option>)}
      </select>
      <ChevronDown aria-hidden="true" data-testid="language-chevron" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-muted" />
      </div>
    </div>
  );
}
