"use client";

import { AccountControls } from "@/components/layout/AccountControls";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter, type CharacterSlug } from "@/lib/characters/registry";
import type { DayStat, MockSession, StatsSummary } from "@/lib/mock/stats";
import { formatDate, formatDuration } from "@/lib/stats/presentation";
import type { TranslationKey } from "@/translations";
import { Heatmap } from "./Heatmap";
import { StreakCard } from "./StreakCard";

const card = "rounded-2xl border border-border bg-surface p-5 md:p-6";
const characterNames: Record<CharacterSlug, TranslationKey> = { "rain-desk": "stats.rainDesk", "night-shift": "stats.nightShift", "balcony-dusk": "stats.balconyDusk", "dorm-bunk": "stats.dormBunk" };

export function StatsScreen({ days, sessions, summary, referenceDate, showStreak }: { days: readonly DayStat[]; sessions: readonly MockSession[]; summary: StatsSummary; referenceDate: string; showStreak: boolean }) {
  const { locale, t } = useTranslation();
  const number = new Intl.NumberFormat(locale);
  const recent = days.slice(-14);
  const maximum = Math.max(1, ...recent.map((day) => day.totalSeconds));

  return <section aria-label={t("common.stats")} data-testid="stats-screen" className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 md:px-8">
    <AccountControls />
    <h1 className="mb-6 text-title">{t("common.stats")}</h1>
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-small text-text-muted">{t("stats.totalHours")}</h2>
        <p data-testid="stats-total" className="mt-3 text-[72px] leading-none font-semibold tracking-tight tabular-nums">{new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.totalSeconds / 3600)}</p>
        <p className="mt-3 text-small text-text-muted">{t("stats.acrossSessions", { count: number.format(summary.sessionCount) })}</p>
      </section>
      {showStreak && <StreakCard summary={summary} />}
      <section className={card}>
        <h2 className="mb-5 text-body font-semibold">{t("stats.activityTitle")}</h2>
        <Heatmap days={days} referenceDate={referenceDate} />
      </section>
      <section className={card}>
        <h2 className="text-body font-semibold">{t("stats.last14Days")}</h2>
        <div data-testid="recent-bars" className="mt-6 grid grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1">
          {recent.map((day) => {
            const label = day.totalSeconds === 0 ? t("stats.noSessions", { date: formatDate(day.date, locale) }) : t("stats.activityOn", { duration: formatDuration(day.totalSeconds, locale), date: formatDate(day.date, locale) });
            return <div key={day.date} className="min-w-0 text-center">
              <div className="flex h-32 items-end"><div role="img" aria-label={label} title={label} className="w-full rounded-t-[2px]" style={{ height: day.totalSeconds === 0 ? 2 : Math.max(4, day.totalSeconds / maximum * 128), backgroundColor: day.totalSeconds === 0 ? "var(--grey-zero)" : "var(--accent)" }} /></div>
              <span className="mt-2 block text-[10px] text-text-muted tabular-nums">{number.format(Number(day.date.slice(-2)))}</span>
            </div>;
          })}
        </div>
      </section>
      <section className={card}>
        <h2 className="text-body font-semibold">{t("stats.historyTitle")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table data-testid="session-history" className="w-full text-left text-small">
            <caption className="sr-only">{t("stats.historyTitle")}</caption>
            <thead className="text-text-muted"><tr>
              <th scope="col" className="py-3 pr-5 font-normal">{t("stats.date")}</th>
              <th scope="col" className="py-3 pr-5 font-normal">{t("stats.duration")}</th>
              <th scope="col" className="py-3 font-normal">{t("stats.character")}</th>
            </tr></thead>
            <tbody>{sessions.map((session) => <tr key={session.id} className="border-t border-border">
              <td className="py-3 pr-5 whitespace-nowrap"><time dateTime={session.date}>{formatDate(session.date, locale, true)}</time></td>
              <td className="py-3 pr-5 whitespace-nowrap tabular-nums">{formatDuration(session.totalSeconds, locale)}</td>
              <td className="py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCharacter(session.character).accentColor }} />{t(characterNames[session.character])}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  </section>;
}
