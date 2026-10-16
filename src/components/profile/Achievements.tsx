"use client";
import { Award as AwardIcon } from "lucide-react";
import { useAchievements } from "@/hooks/useAchievements";
import { useTranslation } from "@/hooks/useTranslation";
import { streakMilestones } from "@/lib/achievements/eligibility";
export function Achievements() {
    const awards = useAchievements();
    const { t } = useTranslation();
    const earned = new Set(awards.data?.map(award => award.milestone) ?? []);
    return <section aria-label={t("achievements.title")} className="mt-6 rounded-2xl border border-border bg-surface p-6">
    <h2 className="text-xl font-semibold">{t("achievements.title")}</h2>
    {awards.isError && <p role="alert">{t("profile.error")}</p>}
    <p className="mt-2 text-small text-text-muted">{t("achievements.description")}</p>
    <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">{streakMilestones.map(milestone => <li key={milestone} aria-label={t(earned.has(milestone) ? "achievements.earned" : "achievements.available", { n: milestone })} className={`flex flex-col items-center gap-2 rounded-xl p-3 ${earned.has(milestone) ? "bg-accent/15 text-accent" : "bg-surface-2 text-text-muted"}`}>
      <AwardIcon aria-hidden="true" className="size-8"/><span className="tabular-nums">{milestone}</span>
    </li>)}</ul>
  </section>;
}
