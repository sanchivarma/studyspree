"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { ScenePlaceholder } from "@/components/scene/ScenePlaceholder";
import { useCountUp } from "@/hooks/useCountUp";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter, type CharacterSlug } from "@/lib/characters/registry";

export function CompleteScreen({ slug }: { slug: CharacterSlug }) {
  const { locale, t } = useTranslation();
  const hours = useCountUp(41.8, 42.5, 1200);
  const format = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), [locale]);
  const style = { "--accent": getCharacter(slug).accentColor } as CSSProperties;

  return <section aria-label={t("complete.label")} data-testid="complete-screen" className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden" style={style}>
    <ScenePlaceholder slug={slug} className="opacity-30" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/80" />
    <div className="relative w-full max-w-[480px] px-6 py-12 text-center">
      <h1 className="text-[20px] font-medium">{t("complete.affirmation")}</h1>
      <h2 aria-label={t("complete.totalLabel", { hours: format.format(42.5) })} className="mt-8">
        <span aria-hidden="true" data-testid="all-time-hours" className="block text-[72px] leading-none font-semibold tracking-tight tabular-nums">{format.format(hours)}</span>
        <span aria-hidden="true" className="mt-3 block text-[13px] font-normal text-text-muted">{t("complete.allTime")}</span>
      </h2>
      <p className="mt-8 text-[13px] text-text-muted tabular-nums">{t("complete.summary")}</p>
      <p className="mt-4 flex items-center justify-center gap-2 text-small text-text-muted tabular-nums">
        <Flame aria-hidden="true" className="size-4 text-accent" />{t("complete.streak", { count: 4 })}
      </p>
      <Link href="/" className="mt-9 flex h-14 w-full items-center justify-center rounded-2xl bg-accent px-6 text-body font-semibold text-background">{t("complete.startAnother")}</Link>
      <Link href="/stats" className="mt-3 inline-flex min-h-11 items-center rounded-lg px-3 text-small text-text-muted hover:text-foreground">{t("complete.done")}</Link>
    </div>
  </section>;
}
