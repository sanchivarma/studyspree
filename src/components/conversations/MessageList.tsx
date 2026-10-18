"use client";
import type { CommunityItem } from "@/lib/community/schemas";
import { useTranslation } from "@/hooks/useTranslation";

export function MessageList({ messages, timezone }: { messages: readonly CommunityItem[]; timezone: string }) {
  const { t, locale } = useTranslation();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  return <ol className="space-y-3">{messages.map(message => <li key={message.id} className="rounded-xl border border-border p-3">
    <div className="flex flex-wrap justify-between gap-2 text-small text-text-muted">
      <span>{typeof message.data.authorName === "string" ? message.data.authorName : t("community.member")}</span>
      <time dateTime={message.createdAt}>{format.format(new Date(message.createdAt))}</time>
    </div>
    <p className="mt-2 whitespace-pre-wrap break-words">{message.data.removed ? t("community.remove") : message.body}</p>
  </li>)}</ol>;
}
