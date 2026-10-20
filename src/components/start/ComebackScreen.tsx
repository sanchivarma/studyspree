"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { getTheme } from "@/lib/themes/registry";
import { useTranslation } from "@/hooks/useTranslation";
import { useStartSession } from "@/hooks/useStartSession";
import { soloCompanions } from "@/lib/characters/schemas";

export function ComebackScreen({ name, slug, totalSeconds, daysAway, onDismiss }: {
  name: string; slug: string; totalSeconds: number; daysAway: number; onDismiss: () => void;
}) {
  const { locale, t } = useTranslation();
  const starting = useRef(false);
  const startButton = useRef<HTMLButtonElement>(null);
  const { mutate, isPending, error } = useStartSession(() => console.debug("comeback_converted", { days_away: daysAway }));
  const hours = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(totalSeconds / 3600);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || ![" ", "Enter"].includes(event.key)) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, button, a, [contenteditable]")) return;
      event.preventDefault(); startButton.current?.click();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return <section data-testid="comeback-screen" aria-label={t("comeback.welcome", { name })}
    style={{ "--accent": getTheme(slug).accentColor } as CSSProperties}
    className="relative isolate flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-background md:min-h-dvh">
    <div className="relative w-full max-w-[480px] px-6 py-24 text-center">
      <h1 className="text-[20px] font-medium">{t("comeback.welcome", { name })}</h1>
      <p className="mt-4 text-[36px] leading-tight font-semibold tabular-nums">{t("comeback.hours", { count: hours })}</p>
      <p className="mt-6 text-body text-foreground/80">{t("comeback.suggestion")}</p>
      <button ref={startButton} type="button" aria-keyshortcuts="Enter Space" disabled={isPending} onClick={() => {
        if (starting.current || isPending) return;
        starting.current = true;
        mutate({ plannedMinutes: 5, themeSlug: slug, task: null, companions: soloCompanions() }, { onSettled: () => { starting.current = false; } });
      }} className="mt-8 h-14 w-full rounded-2xl bg-accent text-[18px] font-semibold text-background disabled:opacity-60">{t("common.start")}</button>
      {error && <p role="alert" className="mt-3 text-small text-text-muted">{t("study.startError")}</p>}
      <button type="button" onClick={onDismiss} className="mt-3 min-h-11 rounded-lg px-4 text-small text-foreground/70 hover:text-foreground">{t("comeback.notNow")}</button>
    </div>
  </section>;
}
