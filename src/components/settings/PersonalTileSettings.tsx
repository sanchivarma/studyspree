"use client";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { useTranslation } from "@/hooks/useTranslation";
import { useTileStatusHistory } from "@/hooks/useTileStatusHistory";
export function PersonalTileSettings() {
    const tile = usePersonalTile();
    const { t } = useTranslation();
    const history = useTileStatusHistory();
    return <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
    <h2 className="font-semibold">{t("personalTile.title")}</h2>
    {(["mirrored", "isVisible"] as const).map(key => <label key={key} className="flex min-h-14 items-center justify-between gap-3">
      {t(`personalTile.${key}`)}<input type="checkbox" className="size-5 accent-accent" checked={tile.data?.[key] ?? true} disabled={!tile.data} onChange={event => tile.mutation.mutate({ [key]: event.target.checked })}/>
    </label>)}
    <form onSubmit={event => { event.preventDefault(); const input = new FormData(event.currentTarget).get("status"); tile.mutation.mutate({ status: String(input ?? "") }); }}>
      <label className="block" htmlFor="tile-status">{t("personalTile.status")}</label>
      <input id="tile-status" key={tile.data?.status} name="status" defaultValue={tile.data?.status ?? ""} maxLength={200} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3"/>
      <button className="mt-2 min-h-11 rounded-xl px-4 text-accent" disabled={tile.mutation.isPending}>{t("personalTile.post")}</button>
      <button type="button" className="min-h-11 px-4" onClick={() => tile.mutation.mutate({ status: "" })}>{t("roadmap.clearStatus")}</button>
    </form>
    <p className="text-small text-text-muted">{t("personalTile.privacy")}</p>
    <p className="mt-3 text-small">{t("roadmap.spotifyUnavailable")}</p>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled checked={tile.data?.shareNowPlaying ?? false}/>{t("roadmap.shareNowPlaying")}</label>
    <details className="mt-3"><summary className="min-h-11 cursor-pointer">{t("personalTile.history")}</summary><ul className="space-y-2">{history.data?.pages.flatMap(p => p.items).map(entry => <li key={entry.id} className="break-words text-small">{entry.text || t("roadmap.clearStatus")}</li>)}</ul>{history.hasNextPage && <button className="min-h-11 px-3" type="button" onClick={() => void history.fetchNextPage()}>{t("community.loadMore")}</button>}{history.isError && <p role="alert">{t("profile.error")}</p>}</details>
    {tile.mutation.isError && <p role="alert">{t("profile.error")}</p>}
  </section>;
}
