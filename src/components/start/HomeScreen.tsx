"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ScenePlaceholder } from "@/components/scene/ScenePlaceholder";
import { AccountControls } from "@/components/layout/AccountControls";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentHour } from "@/hooks/useCurrentHour";
import type { CharacterSlug } from "@/lib/characters/registry";

export function HomeScreen({ username, slug, initialHour }: { username: string; slug: CharacterSlug; initialHour: number }) {
  const { t } = useTranslation();
  const hour = useCurrentHour(initialHour);
  return <section className="relative isolate flex min-h-[calc(100dvh-3.5rem)] items-center justify-center md:min-h-dvh">
    <ScenePlaceholder slug={slug} />
    <div aria-hidden="true" className="start-screen-scrim pointer-events-none absolute inset-0" />
    <AccountControls />
    <div className="relative w-full max-w-[480px] px-6 py-28">
      <h1 className="text-title">{t(hour < 12 ? "home.morning" : hour < 18 ? "home.afternoon" : "home.evening", { username })}</h1>
      <p className="mt-4 text-body text-text-muted">{t("common.tagline")}</p>
      <Link href="/study" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-2xl bg-accent px-6 text-body font-semibold text-background">
        <BookOpen aria-hidden="true" className="size-5" />{t("home.studyLink")}
      </Link>
    </div>
  </section>;
}
