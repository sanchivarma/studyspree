"use client";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { RoomChat } from "@/components/community/RoomChat";
import { SessionNotes } from "./SessionNotes";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function SessionChat({ sessionId, roomId, onClose, onRestoreFocus }: { sessionId: string; roomId?: string | null; onClose: () => void; onRestoreFocus: () => void }) {
  const { t } = useTranslation();
  if (roomId) return <RoomChat roomId={roomId} onClose={onClose} onRestoreFocus={onRestoreFocus}/>;
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent id="room-chat" side="right" showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }} onKeyDown={event => event.stopPropagation()} className="w-[min(22rem,100dvw)] bg-surface p-5 motion-reduce:animate-none sm:max-w-[22rem]">
    <SheetHeader className="pr-10"><SheetTitle>{t("room.chat")}</SheetTitle><SheetDescription>{t("room.notesPrompt")}</SheetDescription></SheetHeader>
    <button type="button" aria-label={t("scene.close")} onClick={onClose} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-xl"><X aria-hidden="true" className="size-5"/></button>
    <SessionNotes sessionId={sessionId}/>
  </SheetContent></Sheet>;
}
