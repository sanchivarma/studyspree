"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useSession(id: string) {
  const opts = { limit: Number.MAX_SAFE_INTEGER, offset: 0 };
  return useQuery({ queryKey: queryKeys.stats.sessions(opts), queryFn: () => repo.getSessions(opts),
    select: (sessions) => sessions.find((session) => session.id === id) ?? null });
}
