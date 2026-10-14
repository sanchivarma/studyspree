"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useEffect, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { SceneVideo } from "@/components/scene/SceneVideo";
import { useCountUp } from "@/hooks/useCountUp";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter } from "@/lib/characters/registry";
import { formatBankedDuration } from "@/lib/session/presentation";
import { useCompletionSummary, type CompletionSummary } from "@/hooks/useCompletionSummary";
import { useSessionStore } from "@/stores/sessionStore";
import { affirmationKey, isRecentCompletion } from "@/lib/session/completion";
import { now } from "@/lib/clock";

export function CompleteScreen({ id }: { id: string }) {
  const router = useRouter();
  const summary = useCompletionSummary(id);
  useEffect(() => {
    useSessionStore.getState().setFinishing(false);
    if (summary.isPending || summary.isError) return;
    if (!summary.data) { router.replace("/"); return; }
    const expiresAt = new Date(summary.data.session.endedAt!).getTime() + 600_000;
    const timeout = setTimeout(() => router.replace("/"), Math.max(0, expiresAt - now().getTime()));
    return () => clearTimeout(timeout);
  }, [summary.data, summary.isPending, summary.isError, router]);
  if (!summary.data || !isRecentCompletion(summary.data.session, now().getTime())) return null;
  return <CompletionContent summary={summary.data} />;
}

function CompletionContent({ summary }: { summary: CompletionSummary }) {
  const { locale, t } = useTranslation();
  const slug = getCharacter(summary.session.characterSlug).slug;
  const totalHours = summary.totalSecondsAllTime / 3600;
  const hours = useCountUp(Math.max(0, summary.totalSecondsAllTime - summary.session.actualSeconds) / 3600, totalHours, 1200);
  const format = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), [locale]);
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const style = { "--accent": getCharacter(slug).accentColor } as CSSProperties;

  return <section aria-label={t("complete.label")} data-testid="complete-screen" className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden" style={style}>
    <SceneVideo slug={slug} className="opacity-30" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/80" />
    <div className="relative w-full max-w-[480px] px-6 py-12 text-center">
      <h1 className="text-[20px] font-medium">{t(affirmationKey(summary.session.actualSeconds))}</h1>
      <h2 aria-label={t("complete.totalLabel", { hours: format.format(totalHours) })} className="mt-8">
        <span aria-hidden="true" data-testid="all-time-hours" className="block text-[72px] leading-none font-semibold tracking-tight tabular-nums">{format.format(hours)}</span>
        <span aria-hidden="true" className="mt-3 block text-[13px] font-normal text-text-muted">{t("complete.allTime")}</span>
      </h2>
      <p data-testid="banked-summary" className="mt-8 text-[13px] text-text-muted tabular-nums">{t("complete.summary", {
        sessionDuration: summary.session.actualSeconds < 60 ? formatBankedDuration(summary.session.actualSeconds, locale) : t("complete.sessionMinutes", { minutes: number.format(Math.floor(summary.session.actualSeconds / 60)) }),
        todayDuration: t("complete.todayDuration", { hours: number.format(Math.floor(summary.dayTotalSeconds / 3600)), minutes: number.format(Math.floor(summary.dayTotalSeconds / 60) % 60) }),
      })}</p>
      {summary.profile.showStreak && summary.streak.changed && <div data-testid="completion-streak" className="mt-4 text-small text-text-muted">
        <p className="flex items-center justify-center gap-2 tabular-nums">
          <Flame aria-hidden="true" className="size-4 text-accent" />
          <span>{summary.streak.current === 1 ? t("complete.dayOne") : t("complete.streak", { count: number.format(summary.streak.current) })}</span>
        </p>
        {summary.streak.freezeUsed && <p data-testid="freeze-notice" className="mt-2 text-[13px]">{t("complete.freezeNotice")}</p>}
      </div>}
      <Link href="/" className="mt-9 flex h-14 w-full items-center justify-center rounded-2xl bg-accent px-6 text-body font-semibold text-background">{t("complete.startAnother")}</Link>
      <Link href="/stats" className="mt-3 inline-flex min-h-11 items-center rounded-lg px-3 text-small text-text-muted hover:text-foreground">{t("complete.done")}</Link>
    </div>
  </section>;
}
