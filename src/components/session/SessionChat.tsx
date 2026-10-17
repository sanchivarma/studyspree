"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useDashboard } from "@/hooks/useDashboard";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { RoomChat } from "@/components/community/RoomChat";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function SessionChat({ sessionId, onClose, onRestoreFocus }: { sessionId: string; onClose: () => void; onRestoreFocus: () => void }) {
  const { t } = useTranslation();
  const account = useAccountMode();
  const dashboard = useDashboard(account === "account");
  const mutation = useCommunityMutation();
  const router = useRouter();
  const roomId = dashboard.data?.activeRoomId;
  if (roomId) return <RoomChat roomId={roomId} onClose={onClose} onRestoreFocus={onRestoreFocus}/>;
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent id="room-chat" side="right" showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }} onKeyDown={event => event.stopPropagation()} className="w-[min(22rem,100dvw)] bg-surface p-5 motion-reduce:animate-none sm:max-w-[22rem]">
    <SheetHeader className="pr-10"><SheetTitle>{t("room.chat")}</SheetTitle><SheetDescription>{t(account === "preview" ? "room.previewChat" : "room.sharedChat")}</SheetDescription></SheetHeader>
    <button type="button" aria-label={t("scene.close")} onClick={onClose} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-xl"><X aria-hidden="true" className="size-5"/></button>
    {account === "account" && dashboard.isPending ? <p role="status">{t("community.loading")}</p> : account === "account" ? <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "session.share", data: { id: sessionId } }, { onSuccess: room => router.push(`/rooms/${room.id}`) })} className="min-h-11 rounded-xl bg-accent px-4 text-background disabled:opacity-50">{t("room.openSharedChat")}</button> : <Link href="/invite" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4">{t("characters.people")}</Link>}
    {(dashboard.isError || mutation.isError) && <p role="alert" className="text-small">{t("community.unavailable")}</p>}
  </SheetContent></Sheet>;
}
