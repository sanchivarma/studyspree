"use client";
import Link from "next/link";
import { Pin, Users, Sparkles } from "lucide-react";
import { z } from "zod";
import { useCommunity } from "@/hooks/useCommunity";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useTranslation } from "@/hooks/useTranslation";
import { itemSchema, type CommunityItem } from "@/lib/community/schemas";
import { characterSlugs } from "@/types/characters";
import { getCharacter } from "@/lib/characters/registry";

const detailsSchema = z.object({
  humanCount: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  characterSlugs: z.array(z.enum(characterSlugs)),
});

function PublicRoomCard({ item, permanent = false }: { item: CommunityItem; permanent?: boolean }) {
  const { t } = useTranslation();
  const parsed = detailsSchema.safeParse(item.data);
  if (!parsed.success) return <li className="rounded-xl border border-border p-4"><h3 className="font-semibold">{item.title}</h3><p role="status">{t("community.unavailable")}</p></li>;
  const details = parsed.data;
  const full = details.humanCount >= details.capacity;
  const names = details.characterSlugs.map(slug => t(getCharacter(slug)!.nameKey));
  return <li data-testid={permanent ? "default-study-room" : "public-study-room"} className={`space-y-2 rounded-xl border p-4 ${permanent ? "border-accent/50 bg-accent/5 sm:col-span-2" : "border-border"}`}>
    {permanent && <p className="flex items-center gap-2 text-small text-accent"><Pin aria-hidden="true" className="size-4"/>{t("community.pinned")}</p>}
    <h3 className="font-semibold">{permanent ? t("roomControls.defaultTitle") : item.title}</h3>
    {permanent ? <>
      <p className="text-small text-accent">{t("roomControls.alwaysOpen")} · {t("roomControls.peopleOnly")}</p>
      <p className="text-small text-text-muted">{t("roomControls.alwaysSilent")}</p>
      <details><summary className="min-h-11 cursor-pointer py-3 text-small">{t("roomControls.privacyTitle")}</summary><ul className="list-disc space-y-1 pl-5 text-small text-text-muted">{(["privacy1", "privacy2", "privacy3"] as const).map(key => <li key={key}>{t(`roomControls.${key}`)}</li>)}</ul></details>
    </> : item.body && <p className="line-clamp-3 whitespace-pre-wrap text-small">{item.body}</p>}
    <p data-testid="public-session-people" className="flex items-center gap-2 text-small text-text-muted tabular-nums"><Users aria-hidden="true" className="size-4"/>{t(details.humanCount === 1 ? "sessionSetup.personJoined" : "sessionSetup.peopleJoined", { count: details.humanCount })}</p>
    <p data-testid="public-session-characters" className="flex items-start gap-2 text-small text-text-muted"><Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0"/>{names.length ? t(names.length === 1 ? "sessionSetup.virtualJoinedOne" : "sessionSetup.virtualJoined", { count: names.length, names: names.join(", ") }) : t("sessionSetup.noVirtualPartners")}</p>
    {full ? <p role="status" className="text-small text-text-muted">{t("community.full")}</p> : <Link className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-background" href={`/rooms/${item.id}`}>{t("community.join")}</Link>}
  </li>;
}
export function PublicSessions() {
  const mode = useAccountMode(); const { t } = useTranslation();
  const query = useCommunity("publicSessions", { limit: 20 }, mode === "account");
  const items = [...new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()];
  const permanent = itemSchema.safeParse(query.data?.pages[0]?.context.defaultRoom);
  return <section data-testid="home-public-sessions" aria-label={t("sessionSetup.publicSessions")} className="mt-6 rounded-2xl border border-border bg-surface/90 p-5">
    <h2 className="text-xl">{t("sessionSetup.publicSessions")}</h2>
    {mode === "preview" ? <ul className="mt-4"><li data-testid="default-study-room" className="space-y-2 rounded-xl border border-accent/50 bg-accent/5 p-4"><p className="flex items-center gap-2 text-small text-accent"><Pin aria-hidden="true" className="size-4"/>{t("community.pinned")}</p><h3 className="font-semibold">{t("roomControls.defaultTitle")}</h3><p className="text-small text-text-muted">{t("roomControls.alwaysOpen")} · {t("roomControls.peopleOnly")}</p><p className="text-small text-text-muted">{t("sessionSetup.previewPublic")}</p></li></ul>
      : query.isError ? <p role="alert">{t("community.unavailable")}</p>
        : query.isPending ? <p role="status">{t("community.loading")}</p>
          : <><ul className="mt-4 grid gap-3 sm:grid-cols-2">{permanent.success && <PublicRoomCard item={permanent.data} permanent/>}{items.map(item => <PublicRoomCard key={item.id} item={item}/>)}</ul>{items.length === 0 && <p className="mt-3 text-text-muted">{t("sessionSetup.empty")}</p>}</>}
    {query.hasNextPage && <button className="mt-3 min-h-11 rounded-xl border border-border px-4" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{t("community.loadMore")}</button>}
  </section>;
}
