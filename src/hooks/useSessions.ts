"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useSessions() {
  const limit = 20;
  return useInfiniteQuery({
    queryKey: queryKeys.stats.history(limit), staleTime: 300_000, initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // The repository can include one active record. Overfetch that slot and
      // one lookahead record so each displayed page has 20 ended sessions.
      const records = await repo.getSessions({ limit: limit + 2, offset: pageParam });
      const ended = records.filter((session) => session.endedAt !== null);
      const sessions = ended.slice(0, limit);
      const lastId = sessions.at(-1)?.id;
      const nextOffset = ended.length > limit ? pageParam + records.findIndex((session) => session.id === lastId) + 1 : undefined;
      return { sessions, nextOffset };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}
