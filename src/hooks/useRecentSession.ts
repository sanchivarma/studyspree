"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useRecentSession() {
  const opts = { limit: 1, offset: 0 };
  return useQuery({ queryKey: queryKeys.stats.sessions(opts), queryFn: () => repo.getSessions(opts) });
}
