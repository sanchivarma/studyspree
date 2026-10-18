"use client";
import Link from "next/link";
import { useCommunity } from "@/hooks/useCommunity";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useTranslation } from "@/hooks/useTranslation";
import { itemSchema, type CommunityItem } from "@/lib/community/schemas";

function PublicRoomCard({ item, permanent = false }: { item: CommunityItem; permanent?: boolean }) {
  const { t } = useTranslation();
  return <li data-testid={permanent ? "default-study-room" : "public-study-room"} className={`space-y-2 rounded-xl border p-4 ${permanent ? "border-accent/50 bg-accent/5 sm:col-span-2" : "border-border"}`}>
    <h3 className="font-semibold">{permanent ? t("roomControls.defaultTitle") : item.title}</h3>
    {permanent ? <>
      <p className="text-small text-accent">{t("roomControls.alwaysOpen")} · {t("roomControls.peopleOnly")}</p>
      <p className="text-small text-text-muted">{t("roomControls.alwaysSilent")}</p>
      <details><summary className="min-h-11 cursor-pointer py-3 text-small">{t("roomControls.privacyTitle")}</summary><ul className="list-disc space-y-1 pl-5 text-small text-text-muted">{(["privacy1", "privacy2", "privacy3"] as const).map(key => <li key={key}>{t(`roomControls.${key}`)}</li>)}</ul></details>
    </> : item.body && <p className="line-clamp-3 whitespace-pre-wrap text-small">{item.body}</p>}
    <p className="text-small text-text-muted tabular-nums">{t("roomControls.capacity", { n: Number(item.data.humanCount ?? 0) })}</p>
    <Link className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-background" href={`/rooms/${item.id}`}>{t("community.join")}</Link>
  </li>;
}
export function PublicSessions() {
  const mode = useAccountMode(); const { t } = useTranslation();
  const query = useCommunity("publicSessions", { limit: 20 }, mode === "account");
  const items = [...new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()];
  const permanent = itemSchema.safeParse(query.data?.pages[0]?.context.defaultRoom);
  return <section className="mt-6 rounded-2xl border border-border bg-surface/90 p-5">
    <h2 className="text-xl">{t("sessionSetup.publicSessions")}</h2>
    {mode === "preview" ? <p className="mt-3 text-small text-text-muted">{t("sessionSetup.previewPublic")}</p>
      : query.isError ? <p role="alert">{t("community.unavailable")}</p>
        : query.isPending ? <p role="status">{t("community.loading")}</p>
          : <><ul className="mt-4 grid gap-3 sm:grid-cols-2">{permanent.success && <PublicRoomCard item={permanent.data} permanent/>}{items.map(item => <PublicRoomCard key={item.id} item={item}/>)}</ul>{items.length === 0 && <p className="mt-3 text-text-muted">{t("sessionSetup.empty")}</p>}</>}
    {query.hasNextPage && <button className="mt-3 min-h-11 rounded-xl border border-border px-4" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{t("community.loadMore")}</button>}
  </section>;
}
