"use client";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { useTranslation } from "@/hooks/useTranslation";
export function PersonalTileSettings() {
    const tile = usePersonalTile();
    const { t } = useTranslation();
    return <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
    <h2 className="font-semibold">{t("personalTile.title")}</h2>
    {(["mirrored", "isVisible"] as const).map(key => <label key={key} className="flex min-h-14 items-center justify-between gap-3">
      {t(`personalTile.${key}`)}<input type="checkbox" className="size-5 accent-accent" checked={tile.data?.[key] ?? true} disabled={!tile.data} onChange={event => tile.mutation.mutate({ [key]: event.target.checked })}/>
    </label>)}
    <form onSubmit={event => { event.preventDefault(); const input = new FormData(event.currentTarget).get("status"); tile.mutation.mutate({ status: String(input ?? "") }); }}>
      <label className="block" htmlFor="tile-status">{t("personalTile.status")}</label>
      <input id="tile-status" key={tile.data?.status} name="status" defaultValue={tile.data?.status ?? ""} maxLength={200} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3"/>
      <button className="mt-2 min-h-11 rounded-xl px-4 text-accent" disabled={tile.mutation.isPending}>{t("personalTile.post")}</button>
    </form>
    <p className="text-small text-text-muted">{t("personalTile.privacy")}</p>
    <details className="mt-3"><summary className="min-h-11 cursor-pointer">{t("personalTile.history")}</summary><ul className="space-y-2">{tile.data?.history.map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="break-words text-small">{entry.text}</li>)}</ul></details>
    {tile.mutation.isError && <p role="alert">{t("profile.error")}</p>}
  </section>;
}
