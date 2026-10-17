"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fitTileGrid, tilePage } from "@/lib/session/tileLayout";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

export type ParticipantTile = { id: string; content: ReactNode };

export function ParticipantGrid({ tiles, testId, className, controlsVisible = true }: {
  tiles: ParticipantTile[]; testId: string; className?: string; controlsVisible?: boolean;
}) {
  const { t } = useTranslation();
  const [requestedPage, setPage] = useState(0);
  const [size, setSize] = useState({ width: 1024, height: 600 });
  const grid = useRef<HTMLDivElement>(null);
  const current = tilePage(tiles, requestedPage);
  const { columns, rows } = fitTileGrid(current.items.length, size.width, size.height);
  useEffect(() => {
    const node = grid.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden", className)}>
    <div ref={grid} data-testid={testId} data-page={current.page + 1} data-columns={columns} data-rows={rows}
      className="grid min-h-0 min-w-0 flex-1 gap-1 overflow-hidden [&>*]:min-h-0 [&>*]:min-w-0"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
      {current.items.map(tile => <div key={tile.id} data-tile-id={tile.id} className="relative min-h-0 min-w-0 overflow-hidden rounded-lg bg-surface [&>*]:h-full [&>*]:min-h-0">{tile.content}</div>)}
    </div>
    {current.pages > 1 && <nav aria-label={t("characters.pages")} className={cn("flex h-11 shrink-0 items-center justify-center gap-3", !controlsVisible && "invisible")}>
      <button type="button" aria-label={t("community.previousPage")} disabled={current.page === 0} onClick={() => setPage(current.page - 1)} className="flex size-11 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"><ChevronLeft aria-hidden="true" className="size-4"/></button>
      <span aria-live="polite" className="text-small tabular-nums">{current.page + 1} / {current.pages}</span>
      <button type="button" aria-label={t("community.nextPage")} disabled={current.page + 1 === current.pages} onClick={() => setPage(current.page + 1)} className="flex size-11 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"><ChevronRight aria-hidden="true" className="size-4"/></button>
    </nav>}
  </div>;
}
