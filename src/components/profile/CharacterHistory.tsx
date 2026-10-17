"use client";
import { useCharacterHistory } from "@/hooks/useCharacterHistory";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter } from "@/lib/characters/registry";
import { formatDuration } from "@/lib/stats/presentation";
export function CharacterHistory() {
 const query = useCharacterHistory(); const { t, locale } = useTranslation();
 return <section className="space-y-3"><h2 className="text-xl">{t("roadmap.characterHistory")}</h2>
 {query.isError && <p role="alert">{t("community.unavailable")}</p>}
 {!query.isPending && !query.data?.length && <p>{t("community.empty")}</p>}
 <ul>{query.data?.map(row => <li className="flex flex-wrap justify-between gap-3 border-b border-border py-3" key={row.slug}><span>{getCharacter(row.slug) ? t(getCharacter(row.slug)!.nameKey) : row.slug}</span><span>{formatDuration(row.totalSeconds, locale)} · {t("stats.acrossSessions", { count: row.sessionCount })}</span></li>)}</ul></section>;
}
