"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { CommunityError } from "@/lib/repo/community";
import { buttonClass } from "./CommunityComposer";

export function RoomChat({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const query = useCommunity("roomChat", { id: roomId });
  const mutation = useCommunityMutation();
  const [body, setBody] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const items = [...new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()].reverse();
  const latest = items.at(-1)?.id;
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { if (stickToBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [latest]);
  return <aside id="room-chat" aria-label={t("room.chat")} data-testid="room-chat" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
  }} className="fixed top-24 right-2 bottom-2 z-40 flex w-[min(22rem,calc(100vw-1rem))] flex-col rounded-2xl border border-border bg-surface shadow-xl">
    <header className="flex items-center justify-between border-b border-border px-4 py-2"><h2 className="font-semibold">{t("room.chat")}</h2><button type="button" aria-label={t("scene.close")} className="flex size-11 items-center justify-center rounded-lg" onClick={onClose}><X aria-hidden="true" className="size-5"/></button></header>
    <div ref={log} role="log" aria-label={t("room.chatMessages")} aria-live="polite" aria-relevant="additions" onScroll={() => { const node = log.current; if (node) stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 70; }} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      {query.isPending && <p role="status">{t("community.loading")}</p>}
      {query.isError && <p role="alert">{t("community.forbidden")}</p>}
      {query.isSuccess && !items.length && <p className="text-small text-text-muted">{t("room.chatEmpty")}</p>}
      {items.map(item => <article key={item.id} data-message-kind={item.data.kind} className="rounded-xl bg-background/50 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-small font-semibold">{item.person?.displayName}</span><time dateTime={item.createdAt} className="text-xs text-text-muted tabular-nums">{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</time></div>
        {item.data.kind === "goal" && <p className="mt-1 text-xs font-semibold text-accent">{t("room.goalPosted")}</p>}
        <p className="mt-1 whitespace-pre-wrap break-words text-small">{item.body}</p>
      </article>)}
    </div>
    <form className="space-y-2 border-t border-border p-3" onSubmit={event => {
      event.preventDefault(); if (!body.trim() || mutation.isPending) return;
      mutation.mutate({ action: "room.chat.send", data: { id: roomId, body, clientId: requestId.current } }, { onSuccess: () => { setBody(""); requestId.current = crypto.randomUUID(); stickToBottom.current = true; input.current?.focus(); } });
    }}>
      <label className="block text-small" htmlFor="room-chat-message">{t("room.message")}</label>
      <input ref={input} id="room-chat-message" autoComplete="off" maxLength={1000} value={body} disabled={mutation.isPending} onChange={event => { if (mutation.isError) requestId.current = crypto.randomUUID(); setBody(event.target.value); mutation.reset(); }} placeholder={t("room.sayHi")} className="min-h-11 w-full rounded-xl border border-border bg-background px-3"/>
      <button type="submit" className={buttonClass} disabled={!body.trim() || mutation.isPending}>{t("room.send")}</button>
      {mutation.isError && <p role="alert" className="text-small">{t(mutation.error instanceof CommunityError && mutation.error.code === "chatLimit" ? "room.chatLimit" : "community.unavailable")}</p>}
    </form>
  </aside>;
}
