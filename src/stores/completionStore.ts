import { create } from "zustand";
import { now } from "@/lib/clock";
import { isRecentCompletion } from "@/lib/session/completion";
import type { EndSessionResult } from "@/lib/repo/types";
import type { Profile } from "@/types/domain";

type CompletionReceipt = EndSessionResult & { profile?: Profile; today?: string; todayTotalSeconds?: number };

// Memory only: receipts expire with the completion page and never cross sessions.
export const useCompletionStore = create<{
  result: CompletionReceipt | null;
  remember: (result: CompletionReceipt) => void;
  clear: () => void;
}>(set => ({ result: null, remember: result => set({ result }), clear: () => set({ result: null }) }));

export function getCompletionReceipt(id: string) {
  const result = useCompletionStore.getState().result;
  if (result && !isRecentCompletion(result.session, now().getTime())) {
    useCompletionStore.getState().clear();
    return null;
  }
  return result?.session.id === id ? result : null;
}
