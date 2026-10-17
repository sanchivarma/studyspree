"use client";
import { X } from "lucide-react";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useDashboard } from "@/hooks/useDashboard";
import { useTranslation } from "@/hooks/useTranslation";
import { RoomChat } from "@/components/community/RoomChat";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function SessionChat({ onClose, onRestoreFocus }: { onClose: () => void; onRestoreFocus: () => void }) {
  const { t } = useTranslation();
  const account = useAccountMode();
  const dashboard = useDashboard(account === "account");
  const roomId = dashboard.data?.activeRoomId;
  if (roomId) return <RoomChat roomId={roomId} onClose={onClose} onRestoreFocus={onRestoreFocus}/>;
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent id="room-chat" side="right" showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }} onKeyDown={event => event.stopPropagation()} className="w-[min(22rem,100dvw)] bg-surface p-5 motion-reduce:animate-none sm:max-w-[22rem]">
    <SheetHeader className="pr-10"><SheetTitle>{t("room.chat")}</SheetTitle><SheetDescription>{t(account === "preview" ? "room.previewChat" : "room.sharedChat")}</SheetDescription></SheetHeader>
    <button type="button" aria-label={t("scene.close")} onClick={onClose} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-xl"><X aria-hidden="true" className="size-5"/></button>
    {account === "account" && dashboard.isPending && <p role="status">{t("community.loading")}</p>}
    {dashboard.isError && <p role="alert" className="text-small">{t("community.unavailable")}</p>}
  </SheetContent></Sheet>;
}
