"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useSessionSummary() {
  return useQuery({ queryKey: queryKeys.stats.summary(), queryFn: () => repo.getSessionSummary(), staleTime: 300_000 });
}
