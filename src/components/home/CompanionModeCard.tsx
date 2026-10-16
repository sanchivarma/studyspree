"use client";
import Link from "next/link";
import { BookOpen, Users, UserRound } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAccountMode } from "@/hooks/useAccountMode";

export function CompanionModeCard() {
  const { t } = useTranslation();
  const mode = useAccountMode();
  return <section aria-label={t("characters.title")} className="mt-10">
    <h2 className="text-body font-semibold">{t("dashboard.chooseCompany")}</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Link href="/study?mode=solo" className="rounded-2xl border border-border bg-surface/80 p-5 hover:border-accent">
        <UserRound aria-hidden="true" className="mb-3 size-5 text-accent" /><h3 className="font-semibold">{t("characters.solo")}</h3><p className="mt-2 text-small text-text-muted">{t("dashboard.soloDescription")}</p>
      </Link>
      <Link href="/study?mode=characters" className="rounded-2xl border border-border bg-surface/80 p-5 hover:border-accent">
        <BookOpen aria-hidden="true" className="mb-3 size-5 text-accent" /><h3 className="font-semibold">{t("characters.characters")}</h3><p className="mt-2 text-small text-text-muted">{t("dashboard.characterDescription")}</p>
      </Link>
      <div className="rounded-2xl border border-border bg-surface/80 p-5">
        <Users aria-hidden="true" className="mb-3 size-5 text-accent"/><h3 className="font-semibold">{t("characters.people")}</h3>
        <p className="mt-2 text-small text-text-muted">{t(mode === "preview" ? "invitations.preview" : "invitations.peopleDescription")}</p>
        <Link href="/invite" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-small hover:border-accent">{t("invitations.title")}</Link>
        {mode === "account" && <Link href="/spaces" className="mt-2 inline-flex min-h-11 items-center px-3 text-small underline">{t("spaces.title")}</Link>}
      </div>
    </div>
  </section>;
}
