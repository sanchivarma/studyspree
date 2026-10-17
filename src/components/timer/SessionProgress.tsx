"use client";
import { useTranslation } from "@/hooks/useTranslation";

export function SessionProgress({ elapsedSeconds, plannedMinutes }: { elapsedSeconds: number; plannedMinutes: number | null }) {
  const { t } = useTranslation();
  const progress = plannedMinutes === null ? null : Math.min(1, Math.max(0, elapsedSeconds / (plannedMinutes * 60)));
  return <div role="progressbar" aria-label={t("session.progress")} aria-valuemin={progress === null ? undefined : 0} aria-valuemax={progress === null ? undefined : 100} aria-valuenow={progress === null ? undefined : Math.round(progress * 100)} className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
    <div className="h-full w-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${progress ?? 0.25})` }}/>
  </div>;
}
