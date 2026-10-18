"use client";
import { FeatureDrawer } from "@/components/layout/FeatureDrawer";
import { CommunityComposer, buttonClass } from "@/components/community/CommunityComposer";
import { useThreadMessages } from "@/hooks/useThreadMessages";
import { useTranslation } from "@/hooks/useTranslation";
import type { CommunityItem } from "@/lib/community/schemas";
import { MessageList } from "./MessageList";
import { PendingDeliveries } from "./PendingDeliveries";

function ThreadContent({ parent, timezone }: { parent: CommunityItem; timezone: string }) {
  const conversationId = String(parent.data.threadId);
  const query = useThreadMessages(conversationId, parent.id);
  const { t } = useTranslation();
  if (query.isError) return <p role="alert">{t("community.unavailable")}</p>;
  if (query.isPending) return <p role="status">{t("community.loading")}</p>;
  const state = query.data.pages[0];
  const messages = [...new Map(query.data.pages.flatMap(page => page.items).map(message => [message.id, message])).values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return <div className="space-y-4">
    <MessageList messages={[parent]} timezone={timezone} />
    <MessageList messages={messages} timezone={timezone} />
    {query.hasNextPage && <button type="button" className={buttonClass} disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{t("community.loadMore")}</button>}
    <PendingDeliveries area="messages" id={conversationId} parentId={parent.id} knownIds={messages.map(message => message.id)} />
    <CommunityComposer area="messages" id={conversationId} parentId={parent.id} canPost={state.context.canPost === true} />
  </div>;
}

export function ThreadPanel({ parent, timezone }: { parent: CommunityItem; timezone: string }) {
  const { t } = useTranslation();
  return <FeatureDrawer title={t("roadmap.thread")} trigger={<button type="button" className={buttonClass}>{t("community.replies", { n: Number(parent.data.replies ?? 0) })}</button>}>
    <ThreadContent parent={parent} timezone={timezone} />
  </FeatureDrawer>;
}
