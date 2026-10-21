"use client";

import type { RefObject } from "react";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionTitle } from "@/hooks/useSessionTitle";
import { useTranslation } from "@/hooks/useTranslation";
import { formatTimer } from "@/lib/session/presentation";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/domain";
import { SessionProgress } from "@/components/timer/SessionProgress";

/** Timer ticks update this footer rather than the camera, scenes and participant grid. */
export function SessionFooter({ session, status, isVisible, error, onFinish, finishButton }: {
  session: Session; status?: string; isVisible: boolean; error: Error | null; onFinish: () => void; finishButton: RefObject<HTMLButtonElement | null>;
}) {
  const { elapsedSeconds, remainingSeconds, isFinishing } = useSessionTimer(session);
  const { t } = useTranslation();
  const time = formatTimer(remainingSeconds ?? elapsedSeconds);
  useSessionTitle(time);
  const task = session.task;
  const fade = cn("transition-opacity duration-200 motion-reduce:transition-none", isVisible ? "opacity-100" : "pointer-events-none opacity-0");
  return (<div data-testid="session-controls" className="absolute right-3 bottom-2 left-[60px] z-30 flex h-[48px] items-center gap-3">
      <div className={cn("min-w-0 flex-1 rounded-xl border px-3 py-1",isVisible?"border-border/30 bg-background/45 backdrop-blur-sm":"border-transparent")}>
        <div data-testid="session-details" className={fade}>
          <div className="flex flex-wrap items-baseline gap-x-3"><p data-testid="session-elapsed" className="text-[13px] leading-tight text-foreground/70 tabular-nums">{t("session.elapsed", { time: formatTimer(elapsedSeconds) })}</p>
          {remainingSeconds !== null && <p data-testid="session-time" className="text-[11px] leading-tight text-foreground/50 tabular-nums">{t("session.remaining", { time })}</p>}</div>
          {remainingSeconds === null && <span data-testid="session-time" className="sr-only">{t("session.elapsed", { time })}</span>}
          {(status || task) && <p data-testid={status ? "my-session-status" : undefined} className="truncate text-[11px] leading-tight text-foreground/60">{[status,task].filter(Boolean).join(" · ")}</p>}
        </div>
        <div className={cn("mt-1 transition-opacity duration-200 motion-reduce:transition-none", !isVisible && "opacity-40")}><SessionProgress elapsedSeconds={elapsedSeconds} plannedMinutes={session.plannedMinutes}/></div>
        {error && <p role="alert" className="text-small text-text-muted">{t("session.finishError")}</p>}
      </div>
      <button ref={finishButton} type="button" aria-keyshortcuts="Escape" onClick={onFinish} disabled={isFinishing}
        className={cn("min-h-11 shrink-0 rounded-xl border border-border bg-background/45 px-4 text-body text-foreground/80 backdrop-blur-sm hover:bg-background/60 disabled:opacity-60", fade)}>{t("session.finish")}</button>
    </div>);
}
