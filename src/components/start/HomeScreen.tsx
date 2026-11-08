"use client";

import Link from "next/link";
import { useActiveSession } from "@/hooks/useActiveSession";
import { BookOpen } from "lucide-react";
import { ThemeScene } from "@/components/scene/ThemeScene";
import { useProfile } from "@/hooks/useProfile";
import { AccountControls } from "@/components/layout/AccountControls";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentHour } from "@/hooks/useCurrentHour";
import type { ThemeSlug } from "@/lib/themes/registry";
import { useDashboard } from "@/hooks/useDashboard";
import { CompanionModeCard } from "@/components/home/CompanionModeCard";
import { OnlinePeople } from "@/components/home/OnlinePeople";
import { TodayTasks } from "@/components/tasks/TodayTasks";
import { SavedRooms } from "@/components/home/SavedRooms";

export function HomeScreen({ username, slug, initialHour }: { username: string; slug: ThemeSlug; initialHour: number }) {
  const { t } = useTranslation();
  const active = useActiveSession();
  const profile = useProfile();
  const dashboard = useDashboard();
  const hour = useCurrentHour(initialHour);
  return <section className="relative isolate flex min-h-[calc(100dvh-3.5rem)] items-center justify-center md:min-h-dvh">
    <ThemeScene slug={profile.data?.selectedTheme ?? slug} priority />
    <div aria-hidden="true" className="start-screen-scrim pointer-events-none absolute inset-0" />
    <AccountControls />
    <div className="relative w-full max-w-4xl px-6 py-28">
      <h1 className="text-title">{t(hour < 12 ? "home.morning" : hour < 18 ? "home.afternoon" : "home.evening", { username: profile.data?.displayName || username })}</h1>
      <Link href={active.data ? active.data.roomId ? `/rooms/${active.data.roomId}` : `/session/${active.data.id}` : "/study"} className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-2xl bg-accent px-6 text-body font-semibold text-background">
        <BookOpen aria-hidden="true" className="size-5" />{t(active.data ? "sessionSetup.resume" : "home.studyLink")}
      </Link>
      <SavedRooms />
      <CompanionModeCard />
      <TodayTasks />
      {dashboard.data && <>
        <OnlinePeople people={dashboard.data.onlinePeople} />
      </>}
      {dashboard.isError && <p role="status" className="mt-6 text-small text-text-muted">{t("dashboard.unavailable")}</p>}
    </div>
  </section>;
}
