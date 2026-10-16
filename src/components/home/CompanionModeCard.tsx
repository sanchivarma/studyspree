"use client";
import Link from "next/link";
import { BookOpen, Users, UserRound } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useDashboard } from "@/hooks/useDashboard";

export function CompanionModeCard() {
  const { t } = useTranslation();
  const dashboard=useDashboard();
  return <section aria-label={t("characters.title")} className="mt-10">
    <h2 className="text-body font-semibold">{t("dashboard.chooseCompany")}</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Link href="/study?mode=solo" className="rounded-2xl border border-border bg-surface/80 p-5 hover:border-accent">
        <UserRound aria-hidden="true" className="mb-3 size-5 text-accent" /><h3 className="font-semibold">{t("characters.solo")}</h3><p className="mt-2 text-small text-text-muted">{t("dashboard.soloDescription")}</p>
      </Link>
      <Link href="/study?mode=characters" className="rounded-2xl border border-border bg-surface/80 p-5 hover:border-accent">
        <BookOpen aria-hidden="true" className="mb-3 size-5 text-accent" /><h3 className="font-semibold">{t("characters.characters")}</h3><p className="mt-2 text-small text-text-muted">{t("dashboard.characterDescription")}</p>
      </Link>
      {dashboard.data?.capabilities.humanRooms?<Link href="/spaces" className="rounded-2xl border border-border bg-surface/80 p-5 hover:border-accent"><Users aria-hidden="true" className="mb-3 size-5 text-accent"/><h3 className="font-semibold">{t("characters.people")}</h3><p className="mt-2 text-small text-text-muted">{t("spaces.title")}</p></Link>:<div aria-disabled="true" className="rounded-2xl border border-border bg-surface/80 p-5 text-text-muted">
        <Users aria-hidden="true" className="mb-3 size-5" /><h3 className="font-semibold">{t("characters.people")}</h3><p className="mt-2 text-small">{t("characters.peopleUnavailable")}</p>
      </div>}
    </div>
  </section>;
}
