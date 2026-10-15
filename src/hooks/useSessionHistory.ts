"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { SessionHistoryQuery } from "@/types/stats";

export function useSessionHistory(filters: Omit<SessionHistoryQuery, "cursor" | "limit">) {
  return useInfiniteQuery({
    queryKey: queryKeys.stats.filteredHistory(filters), staleTime: 300_000,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => repo.getSessionHistory({ ...filters, cursor: pageParam, limit: 20 }),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
}
