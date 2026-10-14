"use client";

import { AccountControls } from "@/components/layout/AccountControls";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter, type CharacterSlug } from "@/lib/characters/registry";
import { useTotalSeconds } from "@/hooks/useTotalSeconds";
import { useDayStats } from "@/hooks/useDayStats";
import { useSessions } from "@/hooks/useSessions";
import { useStreak } from "@/hooks/useStreak";
import { useSessionSummary } from "@/hooks/useSessionSummary";
import { useProfile } from "@/hooks/useProfile";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useLocalDate } from "@/hooks/useLocalDate";
import { fillDays } from "@/lib/stats/fillDays";
import { shiftDate } from "@/lib/stats/dates";
import { formatDate, formatDuration } from "@/lib/stats/presentation";
import type { TranslationKey } from "@/translations";
import { Heatmap } from "./Heatmap";
import { StreakCard } from "./StreakCard";

const card = "rounded-2xl border border-border bg-surface p-5 md:p-6";
const characterNames: Record<CharacterSlug, TranslationKey> = { "rain-desk": "stats.rainDesk", "night-shift": "stats.nightShift", "balcony-dusk": "stats.balconyDusk", "dorm-bunk": "stats.dormBunk" };

export function StatsScreen() {
  const { locale, t } = useTranslation();
  // Keep five-minute progress caches fresh when another tab writes a session.
  useActiveSession();
  const profile = useProfile();
  const referenceDate = useLocalDate(profile.data?.timezone);
  const from = referenceDate ? shiftDate(referenceDate, -364) : "1970-01-01";
  const total = useTotalSeconds();
  const dayStats = useDayStats(from, referenceDate ?? from, referenceDate !== null);
  const history = useSessions();
  const streak = useStreak();
  const summary = useSessionSummary();
  const days = referenceDate ? fillDays(dayStats.data ?? [], from, referenceDate) : [];
  const sessions = history.data?.pages.flatMap((page) => page.sessions) ?? [];
  const queries = [profile, total, dayStats, history, streak, summary];
  const hasError = [profile, total, dayStats, streak, summary].some((query) => query.isError) || (history.isError && !history.data);
  // Invalidated totals must be reread before the hero can show cached hours.
  const isLoading = referenceDate === null || queries.some((query) => query.isPending)
    || (total.isStale && total.isFetching) || (summary.isStale && summary.isFetching);
  const number = new Intl.NumberFormat(locale);
  const recent = days.slice(-14);
  const maximum = Math.max(1, ...recent.map((day) => day.totalSeconds));

  return <section aria-label={t("common.stats")} data-testid="stats-screen" className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 md:px-8">
    <AccountControls />
    <h1 className="mb-6 text-title">{t("common.stats")}</h1>
    {hasError ? <div role="alert" className={card}>
      <p>{t("stats.loadError")}</p><button type="button" className="mt-4 min-h-11 rounded-xl border border-border px-4" onClick={() => { for (const query of queries) void query.refetch(); }}>{t("stats.retry")}</button>
    </div> : isLoading ? <p role="status" className="text-small text-text-muted">{t("stats.loading")}</p> : <div className="space-y-4">
      <section className={card}>
        <h2 className="text-small text-text-muted">{t("stats.totalHours")}</h2>
        <p data-testid="stats-total" className="mt-3 text-[72px] leading-none font-semibold tracking-tight tabular-nums">{new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format((total.data ?? 0) / 3600)}</p>
        <p data-testid="stats-session-count" className="mt-3 text-small text-text-muted">{t("stats.acrossSessions", { count: number.format(summary.data?.sessionCount ?? 0) })}</p>
      </section>
      {profile.data?.showStreak && streak.data && referenceDate && <StreakCard streak={streak.data} today={referenceDate} />}
      <section className={card}>
        <h2 className="mb-5 text-body font-semibold">{t("stats.activityTitle")}</h2>
        {referenceDate && <Heatmap key={referenceDate} days={days} referenceDate={referenceDate} />}
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
            <tbody>{sessions.map((session) => <tr key={session.id} data-session-id={session.id} className="border-t border-border">
              <td className="py-3 pr-5 whitespace-nowrap"><time dateTime={session.localDate}>{formatDate(session.localDate, locale, true)}</time></td>
              <td className="py-3 pr-5 whitespace-nowrap tabular-nums">{formatDuration(session.actualSeconds, locale)}</td>
              <td className="py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCharacter(session.characterSlug).accentColor }} />{t(characterNames[getCharacter(session.characterSlug).slug])}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        {sessions.length === 0 && <p className="mt-4 text-small text-text-muted">{t("stats.emptyHistory")}</p>}
        {history.hasNextPage && <button type="button" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-small disabled:opacity-60">{t("stats.loadMore")}</button>}
        {history.isFetchNextPageError && <p role="alert" className="mt-3 text-small text-text-muted">{t("stats.loadError")}</p>}
      </section>
    </div>}
  </section>;
}
