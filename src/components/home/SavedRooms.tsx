"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "radix-ui";
import { Plus, X, Users } from "lucide-react";
import { z } from "zod";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useTranslation } from "@/hooks/useTranslation";
import { itemSchema, type CommunityItem } from "@/lib/community/schemas";
import { PublicRoomCard } from "./PublicSessions";
import { RoomCreationSheet } from "./RoomCreationSheet";

const roomDetails = z.object({ roomKind: z.enum(["permanent-solo", "permanent-shared"]), humanCount: z.number(), characterSlugs: z.array(z.string()) });
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50";

function SavedRoomCard({ item, viewerId }: { item: CommunityItem; viewerId: string }) {
  const { t } = useTranslation();
  const remove = useCommunityMutation();
  const [confirm, setConfirm] = useState(false);
  const isOwner = item.ownerId === viewerId;
  const details = roomDetails.safeParse(item.data);
  if (!details.success) return null;
  return <li data-testid="saved-study-room" className="relative space-y-3 rounded-xl border border-border bg-background/30 p-4 pt-14">
    <div className="flex items-start justify-between gap-2">
      <h3 className="break-words font-semibold">{item.title}</h3>
      <AlertDialog.Root open={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Trigger asChild><button type="button" data-testid="remove-saved-room" aria-label={t(isOwner ? "room.deleteNamed" : "room.removeNamed", { name: item.title })} className="absolute top-1 left-1 flex size-11 items-center justify-center rounded-xl hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"><X aria-hidden="true" className="size-4"/></button></AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-background/80"/>
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-2xl border border-border bg-surface p-6">
            <AlertDialog.Title className="text-xl font-semibold">{t(isOwner ? "room.deleteTitle" : "room.removeTitle", { name: item.title })}</AlertDialog.Title>
            <AlertDialog.Description className="text-small text-text-muted">{t(isOwner ? "room.deleteDescription" : "room.removeDescription")}</AlertDialog.Description>
            {remove.isError && <p role="alert">{t("community.unavailable")}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <AlertDialog.Cancel asChild><button disabled={remove.isPending} className={button}>{t("room.cancel")}</button></AlertDialog.Cancel>
              <button disabled={remove.isPending} className={`${button} bg-accent text-background`} onClick={() => remove.mutate({ action: isOwner ? "room.delete" : "room.unsave", data: { id: item.id } }, { onSuccess: () => setConfirm(false) })}>{t(remove.isPending ? isOwner ? "room.deleting" : "room.removing" : isOwner ? "room.delete" : "room.remove")}</button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
    <p className="text-small text-accent">{t(details.data.roomKind === "permanent-solo" ? "room.permanentSolo" : "room.permanentShared")}</p>
    {details.data.roomKind === "permanent-shared" && <>
      <p className="flex items-center gap-2 text-small text-text-muted tabular-nums"><Users aria-hidden="true" className="size-4"/>{t("sessionSetup.peopleJoined", { count: details.data.humanCount })}</p>
      <p className="text-small text-text-muted tabular-nums">{t("room.virtualCount", { count: details.data.characterSlugs.length })}</p>
    </>}
    <Link href={`/rooms/${item.id}`} className={button}>{t("community.join")}</Link>
  </li>;
}

export function SavedRooms() {
  const { t } = useTranslation();
  const mode = useAccountMode();
  const router = useRouter();
  const rooms = useCommunity("savedRooms", { limit: 20 }, mode === "account");
  const [create, setCreate] = useState(false);
  const [invalidId, setInvalidId] = useState(false);
  const items = [...new Map(rooms.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()];
  const general = itemSchema.safeParse(rooms.data?.pages[0]?.context.defaultRoom);
  return <section data-testid="dashboard-rooms" aria-label={t("room.yourRooms")} className="mt-6 space-y-4 rounded-2xl border border-border bg-surface/90 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl">{t("room.yourRooms")}</h2>
      <button className={button} disabled={mode !== "account"} onClick={() => setCreate(true)}><Plus aria-hidden="true" className="size-4"/>{t("room.create")}</button>
    </div>
    {mode === "preview" ? <div data-testid="default-study-room" className="space-y-2 rounded-xl border border-accent/50 bg-accent/5 p-4"><h3 className="font-semibold">{t("roomControls.defaultTitle")}</h3><p className="text-small text-text-muted">{t("roomControls.alwaysOpen")}</p><p className="text-small text-text-muted">{t("sessionSetup.previewPublic")}</p></div>
      : rooms.isError ? <p role="alert">{t("community.unavailable")}</p>
      : rooms.isPending ? <p role="status">{t("community.loading")}</p>
      : <ul className="grid gap-3 sm:grid-cols-2">
        {general.success && <PublicRoomCard item={general.data} permanent/>}
        {items.map(item => <SavedRoomCard key={item.id} item={item} viewerId={rooms.data.pages[0].viewerId}/>)}
      </ul>}
    {rooms.hasNextPage && <button className={button} disabled={rooms.isFetchingNextPage} onClick={() => void rooms.fetchNextPage()}>{t("community.loadMore")}</button>}
    <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
      event.preventDefault();
      const value = String(new FormData(event.currentTarget).get("roomId") ?? "").trim();
      const parsed = z.uuid().safeParse(value);
      setInvalidId(!parsed.success);
      if (parsed.success) router.push(`/rooms/${parsed.data}`);
    }}>
      <label className="min-w-0 flex-1 text-small">{t("room.roomId")}<input name="roomId" required maxLength={36} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3"/></label>
      <button className={button} disabled={mode !== "account"}>{t("room.openById")}</button>
    </form>
    {invalidId && <p role="alert">{t("room.invalidId")}</p>}
    {create && <RoomCreationSheet onClose={() => setCreate(false)}/>}
  </section>;
}
