"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Share2 } from "lucide-react";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { buttonClass } from "./CommunityComposer";
import { CommunityError } from "@/lib/repo/community";

const subscribe = () => () => {};
export function ShareSessionControl({ sessionId, roomId, onOpenChange }: { sessionId?: string; roomId?: string; onOpenChange?: (open: boolean) => void }) {
  const { t } = useTranslation();
  const mutation = useCommunityMutation();
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const [shared, setShared] = useState<{ id: string; token?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const updateOpen = (value: boolean) => { setOpen(value); onOpenChange?.(value); };
  const link = shared ? `${origin}/invite/${shared.token}` : roomId ? `${origin}/rooms/${roomId}` : "";
  return <div className="relative" onKeyDown={event => { if (open && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); updateOpen(false); } }}>
    <button type="button" className={buttonClass} disabled={mutation.isPending} aria-label={t("calendar.shareSession")} aria-expanded={open} onClick={() => {
      if (roomId || shared) { updateOpen(!open); return; }
      if (sessionId) mutation.mutate({ action: "session.share", data: { id: sessionId } }, { onSuccess: result => { setShared(result); updateOpen(true); } });
    }}><Share2 className="size-4" aria-hidden="true"/><span className="sr-only sm:not-sr-only">{t("calendar.shareSession")}</span></button>
    {open && <div className="absolute top-full right-0 z-40 mt-2 w-[min(320px,calc(100vw-2rem))] space-y-3 rounded-xl border border-border bg-surface p-3 shadow-lg">
      <p className="text-small">{t("calendar.shareHint")}</p><label className="block text-small">{t("calendar.shareLink")}<input readOnly value={link} onFocus={event => event.currentTarget.select()} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2"/></label>
      <button type="button" className={buttonClass} onClick={() => { void navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{t(copied ? "calendar.copied" : "calendar.copy")}</button>
      {shared && <Link className={buttonClass} href={`/rooms/${shared.id}`}>{t("calendar.openSession")}</Link>}
    </div>}
    {mutation.isError && <p role="alert" className="absolute right-0 z-40 w-64 rounded-xl bg-surface p-3 text-small">{t(mutation.error instanceof CommunityError && mutation.error.code === "accountRequired" ? "community.accountRequired" : "community.unavailable")}</p>}
  </div>;
}
