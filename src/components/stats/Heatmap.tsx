"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DayStat } from "@/types/domain";
import { buildHeatmap, getIntensity } from "@/lib/stats/heatmap";
import { formatDate, formatDuration } from "@/lib/stats/presentation";
import { useTranslation } from "@/hooks/useTranslation";

const colors = ["var(--grey-zero)", "color-mix(in srgb, var(--accent) 25%, transparent)", "color-mix(in srgb, var(--accent) 45%, transparent)", "color-mix(in srgb, var(--accent) 70%, transparent)", "var(--accent)"];

export function Heatmap({ days, referenceDate }: { days: readonly DayStat[]; referenceDate: string }) {
  const { locale, t } = useTranslation();
  const cells = useMemo(() => buildHeatmap(days, referenceDate), [days, referenceDate]);
  const last = cells.findLastIndex((cell) => !cell.isFuture && !cell.isPadding);
  const first = cells.findIndex((cell) => !cell.isFuture && !cell.isPadding);
  const [active, setActive] = useState(last);
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
    const dismiss = () => setTooltip(null);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, []);

  const describe = (index: number, includeYear = false) => {
    const cell = cells[index];
    const date = formatDate(cell.date, locale, includeYear);
    return cell.isFuture ? t("stats.futureDate", { date }) : cell.totalSeconds === 0 ? t("stats.noSessions", { date }) : t("stats.activityOn", { duration: formatDuration(cell.totalSeconds, locale), date });
  };
  const showTooltip = (index: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setTooltip({ index, x: Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2)), y: rect.bottom + 8 > window.innerHeight - 64 ? Math.max(8, rect.top - 64) : rect.bottom + 8 });
  };
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = index % 7;
    let next = index;
    switch (event.key) {
      case "ArrowLeft": next = index - 7; break;
      case "ArrowRight": next = index + 7; break;
      case "ArrowUp": next = row > 0 ? index - 1 : index; break;
      case "ArrowDown": next = row < 6 ? index + 1 : index; break;
      case "Home": next = event.ctrlKey || event.metaKey ? first : Math.max(index - row, first); break;
      case "End": next = event.ctrlKey || event.metaKey ? last : Math.min(index - row + 6, last); break;
      case "Escape": setTooltip(null); event.preventDefault(); return;
      default: return;
    }
    event.preventDefault();
    if (!cells[next] || cells[next].isFuture || cells[next].isPadding) return;
    setActive(next);
    const button = gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell-index="${next}"]`);
    button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  const months = cells.flatMap((cell, index) => index === 0 || cell.date.endsWith("-01") ? [{ column: Math.floor(index / 7) + 1, date: cell.date }] : []);
  return <>
    <div ref={scrollRef} data-testid="heatmap-scroll" className="overflow-x-auto pb-3">
      <div className="w-max">
        <div aria-hidden="true" className="ml-8 grid h-6 grid-cols-[repeat(53,11px)] gap-[3px] text-[11px] text-text-muted">
          {months.map((month) => <span key={month.date} style={{ gridColumn: month.column }}>{new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${month.date}T00:00:00Z`))}</span>)}
        </div>
        <div className="flex gap-2">
          <div aria-hidden="true" className="grid w-6 shrink-0 grid-rows-[repeat(7,11px)] gap-[3px] text-[11px] leading-[11px] text-text-muted">
            {[0, 1, 2, 3, 4, 5, 6].map((row) => <span key={row}>{row === 0 || row === 2 || row === 4 ? new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(`2026-10-${String(12 + row).padStart(2, "0")}T00:00:00Z`)) : ""}</span>)}
          </div>
          <div ref={gridRef} role="group" aria-label={t("stats.activityGrid")} data-testid="heatmap-grid" className="grid grid-flow-col grid-cols-[repeat(53,11px)] grid-rows-[repeat(7,11px)] gap-[3px]">
            {cells.map((cell, index) => <button key={cell.date} type="button" data-date={cell.date} data-cell-index={index} data-level={getIntensity(cell.totalSeconds)} data-future={cell.isFuture}
              aria-label={describe(index, true)} aria-describedby={tooltip?.index === index ? tooltipId : undefined}
              disabled={cell.isFuture || cell.isPadding} tabIndex={active === index && !cell.isFuture && !cell.isPadding ? 0 : -1}
              className="h-[11px] w-[11px] rounded-[2px] border-0"
              style={{ backgroundColor: colors[getIntensity(cell.totalSeconds)], opacity: cell.isPadding ? 0 : cell.isFuture ? 0.03 : 1, pointerEvents: cell.isFuture || cell.isPadding ? "none" : undefined }}
              onMouseEnter={(event) => showTooltip(index, event.currentTarget)} onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => { setActive(index); showTooltip(index, event.currentTarget); }} onBlur={() => setTooltip(null)}
              onClick={(event) => showTooltip(index, event.currentTarget)} onKeyDown={(event) => navigate(event, index)} />)}
          </div>
        </div>
      </div>
    </div>
    {tooltip && <div id={tooltipId} role="tooltip" className="pointer-events-none fixed z-40 w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-small text-foreground shadow-lg" style={{ left: tooltip.x, top: tooltip.y }}>{describe(tooltip.index)}</div>}
  </>;
}
