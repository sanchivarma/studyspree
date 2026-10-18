"use client";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useAccountMode } from "@/hooks/useAccountMode";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { useTranslation } from "@/hooks/useTranslation";
import { SessionStatusControl } from "./SessionStatusControl";

export function SessionSelfCaption({ roomId, admin = false, onOpenChange }: { roomId?: string; admin?: boolean; onOpenChange?: (open: boolean) => void }) {
  const mode = useAccountMode();
  const own = useOwnProfile(undefined, mode === "preview");
  const tile = usePersonalTile();
  const { t } = useTranslation();
  return <SessionStatusControl roomId={roomId} onOpenChange={onOpenChange} username={own.data?.username}
    trigger={<button type="button" data-testid="self-caption" aria-label={t("characters.myStatus")} className="flex min-h-11 w-full min-w-0 flex-col justify-center rounded-b-lg bg-surface px-2 py-1 text-left text-[11px] focus-visible:outline-2 focus-visible:outline-accent">
      <span className="flex w-full items-center gap-1"><span className="truncate">{own.data?.username ?? ""}</span>{admin && <span className="rounded bg-accent/15 px-1 text-[9px] text-accent">{t("room.admin")}</span>}</span>
      <span className="block w-full truncate text-text-muted">{tile.data?.status || t("characters.statusPrompt")}</span>
    </button>}/>;
}
