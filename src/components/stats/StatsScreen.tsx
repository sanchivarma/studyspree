"use client";
import { useMemo, useState } from "react";

import { AccountControls } from "@/components/layout/AccountControls";
import { useTranslation } from "@/hooks/useTranslation";
import { getTheme, type ThemeSlug } from "@/lib/themes/registry";
import { useTotalSeconds } from "@/hooks/useTotalSeconds";
import { useDayStats } from "@/hooks/useDayStats";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import type { CompanionMode } from "@/types/characters";
import { statsRangeSchema } from "@/lib/stats/ranges";
import { StudyTimeChart } from "./StudyTimeChart";
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
const themeNames: Record<ThemeSlug, TranslationKey> = { "rain-desk": "stats.rainDesk", "night-shift": "stats.nightShift", "balcony-dusk": "stats.balconyDusk", "dorm-bunk": "stats.dormBunk", "nature-day": "scene.natureDay", "nature-night": "scene.natureNight", "sci-fi": "scene.sciFi", "space": "scene.space" };

export function StatsScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { locale, t } = useTranslation();
  // Keep five-minute progress caches fresh when another tab writes a session.
  useActiveSession();
  const profile = useProfile();
  const referenceDate = useLocalDate(profile.data?.timezone);
  const from = referenceDate ? shiftDate(referenceDate, -364) : "1970-01-01";
  const total = useTotalSeconds();
  const dayStats = useDayStats(from, referenceDate ?? from, referenceDate !== null);
  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [companionMode, setCompanionMode] = useState<CompanionMode | "all">("all");
  const streak = useStreak();
  const summary = useSessionSummary();
  const proposedRange = {
    from: preset === "custom" ? customFrom : preset === "all" ? summary.data?.firstSessionDate ?? from : shiftDate(referenceDate ?? from, 1 - Number(preset)),
    to: preset === "custom" ? customTo : referenceDate ?? from,
  };
  const rangeResult = statsRangeSchema.safeParse(proposedRange);
  const selectedRange = rangeResult.success ? rangeResult.data : { from: referenceDate ?? from, to: referenceDate ?? from };
  const rangeDays = useDayStats(selectedRange.from, selectedRange.to, referenceDate !== null && rangeResult.success);
  const history = useSessionHistory({ ...(preset !== "all" && rangeResult.success ? selectedRange : {}), companionMode: companionMode === "all" ? undefined : companionMode });
  const days = useMemo(() => referenceDate ? fillDays(dayStats.data ?? [], from, referenceDate) : [], [referenceDate, dayStats.data, from]);
  const sessions = useMemo(() => history.data?.pages.flatMap((page) => page.items) ?? [], [history.data]);
  const queries = [profile, total, dayStats, history, streak, summary];
  const hasError = [profile, total, dayStats, streak, summary].some((query) => query.isError);
  // Invalidated totals must be reread before the hero can show cached hours.
  const isLoading = referenceDate === null || [profile, total, dayStats, streak, summary].some((query) => query.isPending)
    || (total.isStale && total.isFetching) || (summary.isStale && summary.isFetching);
  const number = new Intl.NumberFormat(locale);
  const recent = days.slice(-14);
  const maximum = Math.max(1, ...recent.map((day) => day.totalSeconds));

  return <section aria-label={t("common.stats")} data-testid="stats-screen" className={embedded ? "w-full" : "mx-auto w-full max-w-6xl px-4 pt-24 pb-8 md:px-8"}>
    {!embedded && <AccountControls />}
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
        <h2 className="text-body font-semibold">{t("statsRange.title")}</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-small text-text-muted">{t("statsRange.range")}
            <select aria-label={t("statsRange.range")} value={preset} onChange={event => {
              const value = event.target.value;
              if (value === "custom") { setCustomFrom(shiftDate(referenceDate ?? from, -29)); setCustomTo(referenceDate ?? from); }
              setPreset(value);
            }} className="mt-1 block min-h-11 rounded-xl border border-border bg-surface px-3 text-foreground">
              <option value="all">{t("statsRange.all")}</option><option value="7">{t("statsRange.days", { count: 7 })}</option><option value="30">{t("statsRange.days", { count: 30 })}</option><option value="90">{t("statsRange.days", { count: 90 })}</option><option value="custom">{t("statsRange.custom")}</option>
            </select>
          </label>
          {preset === "custom" && <>
            <label className="text-small text-text-muted">{t("statsRange.from")}<input type="date" value={customFrom} max={referenceDate ?? undefined} onChange={event => setCustomFrom(event.target.value)} className="mt-1 block min-h-11 rounded-xl border border-border bg-surface px-3 text-foreground" /></label>
            <label className="text-small text-text-muted">{t("statsRange.to")}<input type="date" value={customTo} max={referenceDate ?? undefined} onChange={event => setCustomTo(event.target.value)} className="mt-1 block min-h-11 rounded-xl border border-border bg-surface px-3 text-foreground" /></label>
          </>}
        </div>
        {!rangeResult.success ? <p role="alert" className="mt-4 text-small">{t("statsRange.invalid")}</p>
          : rangeDays.isError ? <p role="alert" className="mt-4 text-small">{t("stats.loadError")}</p>
          : rangeDays.isPending ? <p role="status" className="mt-4 text-small">{t("stats.loading")}</p>
          : <StudyTimeChart days={rangeDays.data ?? []} range={selectedRange} />}
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
      {rangeResult.success && <section className={card}>
        <h2 className="text-body font-semibold">{t("stats.historyTitle")}</h2>
        <label className="mt-4 block text-small text-text-muted">{t("statsRange.companionFilter")}
          <select aria-label={t("statsRange.companionFilter")} value={companionMode} onChange={event => setCompanionMode(event.target.value as CompanionMode | "all")} className="ml-3 min-h-11 rounded-xl border border-border bg-surface px-3 text-foreground">
            <option value="all">{t("statsRange.allCompanions")}</option><option value="solo">{t("characters.solo")}</option><option value="characters">{t("characters.characters")}</option>
          </select>
        </label>
        <div className="mt-4 overflow-x-auto">
          <table data-testid="session-history" className="w-full text-left text-small">
            <caption className="sr-only">{t("stats.historyTitle")}</caption>
            <thead className="text-text-muted"><tr>
              <th scope="col" className="py-3 pr-5 font-normal">{t("stats.date")}</th>
              <th scope="col" className="py-3 pr-5 font-normal">{t("stats.duration")}</th>
              <th scope="col" className="py-3 font-normal">{t("stats.theme")}</th>
              <th scope="col" className="py-3 pl-5 font-normal">{t("characters.title")}</th>
            </tr></thead>
            <tbody>{sessions.map((session) => <tr key={session.id} data-session-id={session.id} className="border-t border-border">
              <td className="py-3 pr-5 whitespace-nowrap"><time dateTime={session.localDate}>{formatDate(session.localDate, locale, true)}</time></td>
              <td className="py-3 pr-5 whitespace-nowrap tabular-nums">{formatDuration(session.actualSeconds, locale)}</td>
              <td className="py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: getTheme(session.themeSlug).accentColor }} />{t(themeNames[getTheme(session.themeSlug).slug])}</span></td>
              <td className="py-3 pl-5 whitespace-nowrap">{t(session.companions.mode === "characters" || session.companions.mode === "mixed" ? "characters.characters" : session.companions.mode === "people" ? "characters.people" : "characters.solo")}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {history.isPending ? <p role="status" className="mt-4 text-small text-text-muted">{t("stats.loading")}</p>
          : history.isError && !history.data ? <p role="alert" className="mt-4 text-small text-text-muted">{t("stats.loadError")}</p>
          : sessions.length === 0 && <p className="mt-4 text-small text-text-muted">{t("stats.emptyHistory")}</p>}
        {history.hasNextPage && <button type="button" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-small disabled:opacity-60">{t("stats.loadMore")}</button>}
        {history.isFetchNextPageError && <p role="alert" className="mt-3 text-small text-text-muted">{t("stats.loadError")}</p>}
      </section>}
    </div>}
  </section>;
}
