"use client";
import { chartBuckets } from "@/lib/stats/ranges";
import { formatDate, formatDuration } from "@/lib/stats/presentation";
import { useTranslation } from "@/hooks/useTranslation";
import type { DayStat } from "@/types/domain";
import type { StatsRange } from "@/types/stats";

export function StudyTimeChart({ days, range }: { days: DayStat[]; range: StatsRange }) {
  const { t, locale } = useTranslation();
  const buckets = chartBuckets(days, range);
  const max = Math.max(1, ...buckets.map(bucket => bucket.totalSeconds));
  const total = buckets.reduce((sum, bucket) => sum + bucket.totalSeconds, 0);
  return <>
    <p className="mt-4 text-body tabular-nums" data-testid="range-total">{formatDuration(total, locale)}</p>
    <div className="mt-4 flex h-32 items-end gap-1" aria-hidden="true">{buckets.map(bucket => <div key={bucket.from} className="min-w-0 flex-1 rounded-t-sm"
      style={{ height: bucket.totalSeconds === 0 ? 2 : Math.max(4, bucket.totalSeconds / max * 128), backgroundColor: bucket.totalSeconds === 0 ? "var(--grey-zero)" : "var(--accent)" }}
      title={`${formatDate(bucket.from, locale)} – ${formatDate(bucket.to, locale)}: ${formatDuration(bucket.totalSeconds, locale)}`} />)}</div>
    <div className="mt-2 flex justify-between text-[11px] text-text-muted"><span>{formatDate(range.from, locale)}</span><span>{formatDate(range.to, locale)}</span></div>
    <details className="mt-4"><summary className="min-h-11 cursor-pointer text-small text-text-muted">{t("statsRange.table")}</summary>
      <div className="max-h-80 overflow-auto"><table className="w-full text-left text-small">
        <caption className="sr-only">{t("statsRange.title")}</caption>
        <thead><tr><th scope="col">{t("stats.date")}</th><th scope="col">{t("stats.duration")}</th><th scope="col">{t("statsRange.sessions")}</th></tr></thead>
        <tbody>{buckets.map(bucket => <tr key={bucket.from} className="border-t border-border"><td className="py-2">{formatDate(bucket.from, locale)}{bucket.from !== bucket.to && ` – ${formatDate(bucket.to, locale)}`}</td><td className="tabular-nums">{formatDuration(bucket.totalSeconds, locale)}</td><td className="tabular-nums">{bucket.sessionCount}</td></tr>)}</tbody>
      </table></div>
    </details>
  </>;
}
