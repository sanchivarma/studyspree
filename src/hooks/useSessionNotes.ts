"use client";
import { useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { sessionNotesRepository } from "@/lib/repo/sessionNotes";
import type { NoteCursor, SessionNotesPage } from "@/lib/sessionNotes/schemas";

export function useSessionNotes(sessionId: string) {
  const cache = useQueryClient();
  const pending = useRef<{ body: string; id: string } | null>(null);
  const query = useInfiniteQuery({
    queryKey: queryKeys.sessionNotes.read(sessionId), initialPageParam: null as NoteCursor | null,
    queryFn: ({ pageParam, signal }) => sessionNotesRepository.read(sessionId, pageParam, signal),
    getNextPageParam: page => page.nextCursor, retry: false,
  });
  const mutation = useMutation({
    mutationFn: (body: string) => {
      if (pending.current?.body !== body) pending.current = { body, id: crypto.randomUUID() };
      return sessionNotesRepository.add(sessionId, body, pending.current.id);
    },
    onSuccess: note => {
      pending.current = null;
      cache.setQueryData<InfiniteData<SessionNotesPage>>(queryKeys.sessionNotes.read(sessionId), current => current
        ? { ...current, pages: current.pages.map((page, index) => index === 0 ? { ...page, items: [note, ...page.items.filter(item => item.id !== note.id)] } : page) }
        : { pages: [{ items: [note], nextCursor: null }], pageParams: [null] });
      void cache.invalidateQueries({ queryKey: queryKeys.sessionNotes.read(sessionId) });
    },
  });
  const notes = [...new Map(query.data?.pages.flatMap(page => page.items).map(note => [note.id, note]) ?? []).values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return { ...query, notes, mutation };
}
