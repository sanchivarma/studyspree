"use client";

import { Flame } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { StreakState } from "@/lib/streaks/computeStreak";
import { currentStreak } from "@/lib/streaks/currentStreak";

export function StreakCard({ streak, today }: { streak: StreakState; today: string }) {
  const { locale, t } = useTranslation();
  const number = new Intl.NumberFormat(locale);
  const days = (count: number) => count === 0 ? t("common.ready") : t("stats.streakDays", { count: number.format(count) });
  return <section data-testid="streak-card" className="rounded-2xl border border-border bg-surface p-5 md:p-6">
    <h2 className="flex items-center gap-2 text-body font-semibold"><Flame aria-hidden="true" className="size-4 text-accent" />{t("stats.streakTitle")}</h2>
    <dl className="mt-5 grid grid-cols-3 gap-4 text-small">
      <div><dt className="text-text-muted">{t("stats.currentStreak")}</dt><dd data-testid="streak-current" className="mt-2 font-medium tabular-nums">{days(currentStreak(streak, today))}</dd></div>
      <div><dt className="text-text-muted">{t("stats.bestStreak")}</dt><dd className="mt-2 font-medium tabular-nums">{days(streak.best)}</dd></div>
      <div><dt className="text-text-muted">{t("stats.freezesLeft")}</dt><dd className="mt-2 font-medium tabular-nums">{number.format(today >= streak.freezesResetAt ? 2 : streak.freezesRemaining)}</dd></div>
    </dl>
  </section>;
}
