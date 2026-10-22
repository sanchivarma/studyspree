import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { freshSessionSelections } from "./freshSelections";
import type { Profile, Session } from "@/types/domain";
import { useRoomViewStore } from "@/stores/roomViewStore";
const cleaned = new WeakMap<QueryClient, string>();

export function clearClientSelections(cache: QueryClient, sessionId: string) {
  if (cleaned.get(cache) === sessionId) return;
  cleaned.set(cache, sessionId);
  const active = cache.getQueryData<Session | null>(queryKeys.activeSession());
  const resetChoices = !active || active.id === sessionId;
  if (resetChoices) {
    cache.setQueryData<Profile>(queryKeys.profile(), current => current ? { ...current, ...freshSessionSelections() } : current);
    useRoomViewStore.setState({ rooms: {} });
  }
  void cache.cancelQueries({ queryKey: queryKeys.sessionNotes.read(sessionId) });
  cache.removeQueries({ queryKey: queryKeys.sessionNotes.read(sessionId) });
  cache.removeQueries({ queryKey: queryKeys.stats.session(sessionId), type: "inactive" });
  if (resetChoices) {
    void cache.invalidateQueries({ queryKey: queryKeys.profile() });
    void cache.invalidateQueries({ queryKey: queryKeys.personalTile() });
  }
}
