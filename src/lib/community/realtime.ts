"use client";
import { createBrowserAuthClient } from "@/lib/auth/browser";
/** The publication is filtered by the authenticated table RLS for each subscriber. */
export function subscribeToMessages(threadId: string, refresh: () => void): () => void {
 const client=createBrowserAuthClient();
 const channel=client.channel(`thread:${threadId}:${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'chat_messages',filter:`thread_id=eq.${threadId}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();});
 return ()=>{void client.removeChannel(channel);};
}
