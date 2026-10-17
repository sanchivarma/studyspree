"use client";
import { Award } from "lucide-react";
import { useEarnedAchievements } from "@/hooks/useEarnedAchievements";
import { achievementDefinitions } from "@/lib/achievements/registry";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/translations";
export function AchievementGrid({ highestOnly = false }: { highestOnly?: boolean }) {
 const query = useEarnedAchievements(); const { t } = useTranslation();
 const earned = new Set(query.data?.map(a => a.achievementId));
 const order={'streak':0,'study-seconds':1,'session-count':2};
 const definitions = highestOnly ? achievementDefinitions.filter(d => earned.has(d.id)).sort((a,b)=>order[a.kind]-order[b.kind]||b.threshold-a.threshold).slice(0,1) : achievementDefinitions;
 return <section aria-label={t(highestOnly ? "roadmap.highestBadge" : "achievements.title")}>
  {query.isError && <p role="alert">{t("profile.error")}</p>}
  <ul className={highestOnly ? "" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>{definitions.map(d => {
   const n = d.kind === "study-seconds" ? d.threshold / 3600 : d.threshold;
   return <li key={d.id} title={t(d.descriptionKey as TranslationKey, { n })} className={`rounded-xl border border-border p-3 ${earned.has(d.id) ? "text-accent" : "text-text-muted"}`}><Award className="size-6" aria-hidden="true"/><span>{t(d.nameKey as TranslationKey, { n })}</span><p className="text-small">{t(d.descriptionKey as TranslationKey, { n })}</p></li>;
  })}</ul>
 </section>;
}
