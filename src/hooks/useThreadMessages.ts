"use client";
import { useCommunity } from "./useCommunity";
import { useAccountMode } from "./useAccountMode";

export function useThreadMessages(conversationId: string, parentId: string) {
  const mode = useAccountMode();
  return useCommunity("messages", { id: conversationId, parentId }, mode === "account");
}
