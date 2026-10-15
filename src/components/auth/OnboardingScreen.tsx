"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { SceneVideo } from "@/components/scene/SceneVideo";
import { ThemeGrid } from "@/components/scene/ThemeGrid";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTimezones } from "@/hooks/useTimezones";
import { useTranslation } from "@/hooks/useTranslation";
import { defaultTimezone } from "@/lib/stats/defaultTimezone";
import { getTheme, type ThemeSlug } from "@/lib/themes/registry";
import type { AuthProfile } from "@/lib/auth/schemas";

const subscribe = () => () => {};
export function OnboardingScreen({ profile }: { profile: AuthProfile }) {
  const { t } = useTranslation();
  const save = useOnboarding();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(profile.display_name || profile.first_name);
  const deviceTimezone = useSyncExternalStore(subscribe, defaultTimezone, () => profile.timezone);
  const [chosenTimezone, setTimezone] = useState<string | null>(null);
  const timezone = chosenTimezone ?? deviceTimezone;
  const timezones = useTimezones(timezone);
  const [selectedTheme, setTheme] = useState<ThemeSlug>(profile.selected_theme);
  const [showStreak, setStreak] = useState(profile.show_streak);
  const [reduceMotion, setMotion] = useState(profile.reduce_motion);
  const theme = getTheme(selectedTheme);
  return <main style={{ "--accent": theme.accentColor } as CSSProperties} className="relative isolate flex min-h-dvh items-center justify-center px-6 py-24">
    <SceneVideo slug={selectedTheme} priority posterOnly={reduceMotion} />
    <div aria-hidden="true" className="start-screen-scrim pointer-events-none absolute inset-0" />
    <div className="absolute top-4 right-4"><LanguageSelector /></div>
    <form onSubmit={event => {
      event.preventDefault();
      if (step < 3) { if (displayName.trim()) setStep(value => value + 1); return; }
      save.mutate({ displayName, timezone, selectedTheme, showStreak, reduceMotion });
    }} className="relative w-full max-w-[480px] rounded-3xl border border-border bg-surface/95 p-6">
      <p className="text-small text-text-muted">{t("onboarding.step", { step })}</p>
      <h1 className="mt-3 mb-5 text-title">{t(step === 1 ? "onboarding.aboutYou" : step === 2 ? "scene.title" : "onboarding.preferences")}</h1>
      {step === 1 && <div className="space-y-4">
        <div><label htmlFor="onboarding-name" className="block text-small">{t("settings.displayName")}</label>
          <input id="onboarding-name" value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="nickname" required maxLength={100}
            className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3" /></div>
        <div><label htmlFor="onboarding-timezone" className="block text-small">{t("settings.timezone")}</label>
          <select id="onboarding-timezone" value={timezone} onChange={event => setTimezone(event.target.value)} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3">
            {timezones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
          </select></div>
      </div>}
      {step === 2 && <ThemeGrid selectedTheme={selectedTheme} onSelect={setTheme} />}
      {step === 3 && <div className="space-y-4">
        <p className="text-small text-text-muted">{t("onboarding.privacy")}</p>
        <label className="flex min-h-11 items-center justify-between gap-4">{t("settings.showStreak")}<input type="checkbox" checked={showStreak} onChange={event => setStreak(event.target.checked)} className="size-5 accent-accent" /></label>
        <label className="flex min-h-11 items-center justify-between gap-4">{t("settings.reduceMotion")}<input type="checkbox" checked={reduceMotion} onChange={event => setMotion(event.target.checked)} className="size-5 accent-accent" /></label>
      </div>}
      {save.error && <p role="alert" className="mt-4 text-small text-text-muted">{t("onboarding.saveError")}</p>}
      <div className="mt-6 flex gap-3">
        {step > 1 && <button type="button" disabled={save.isPending} onClick={() => setStep(value => value - 1)} className="min-h-12 rounded-xl border border-border px-4 disabled:opacity-50">{t("onboarding.back")}</button>}
        <button type="submit" disabled={save.isPending || !displayName.trim()} className="min-h-12 flex-1 rounded-xl bg-accent px-4 font-semibold text-background disabled:opacity-50">{t(step === 3 ? "onboarding.finish" : "onboarding.next")}</button>
      </div>
    </form>
  </main>;
}
