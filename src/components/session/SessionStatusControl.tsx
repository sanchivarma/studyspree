"use client";
import { PencilLine } from "lucide-react";
import { FeatureDrawer } from "@/components/layout/FeatureDrawer";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { useTranslation } from "@/hooks/useTranslation";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import type { ReactElement } from "react";

export function SessionStatusControl({ onOpenChange, roomId, trigger, username }: { onOpenChange?: (open: boolean) => void; roomId?: string; trigger?: ReactElement; username?: string }) {
  const { t } = useTranslation();
  const tile = usePersonalTile();
  const publication = useCommunityMutation();
  const save = (status: string) => tile.mutation.mutate({ status }, { onSuccess: () => {
    if (roomId) publication.mutate({ action: "room.status", data: { id: roomId, body: status } });
  } });
  return <FeatureDrawer title={t("characters.myStatus")} onOpenChange={open => { onOpenChange?.(open); tile.mutation.reset(); }}
    trigger={trigger ?? <button type="button" aria-label={t("characters.myStatus")} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/60 focus-visible:outline-2 focus-visible:outline-accent"><PencilLine aria-hidden="true" className="size-4"/></button>}>
    <form onSubmit={event => {
      event.preventDefault();
      save(String(new FormData(event.currentTarget).get("status") ?? ""));
    }}>
      {username && <label className="mb-3 block text-small">{t("common.username")}<input readOnly value={username} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3"/></label>}
      <label htmlFor="session-status" className="block text-small">{t("characters.statusPrompt")}</label>
      <input id="session-status" key={tile.data?.status} name="status" maxLength={200} defaultValue={tile.data?.status ?? ""} disabled={!tile.data} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 focus-visible:outline-2 focus-visible:outline-accent"/>
      <p className="mt-2 text-small text-text-muted">{t("characters.statusRemembered")}</p>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={!tile.data || tile.mutation.isPending} className="min-h-11 rounded-xl bg-accent px-4 text-background disabled:opacity-60">{t("characters.saveStatus")}</button>
        <button type="button" disabled={!tile.data || tile.mutation.isPending} onClick={() => save("")} className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-60">{t("characters.clearStatus")}</button>
      </div>
      {tile.mutation.isSuccess && <p role="status" className="mt-3 text-small">{t("characters.statusSaved")}</p>}
      {tile.mutation.isError && <p role="alert" className="mt-3 text-small">{t("characters.statusError")}</p>}
      {publication.isError && <p role="alert" className="mt-3 text-small">{t("characters.statusRoomError")}</p>}
    </form>
  </FeatureDrawer>;
}
