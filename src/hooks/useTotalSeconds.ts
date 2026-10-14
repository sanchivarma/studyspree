"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useTotalSeconds() {
  return useQuery({ queryKey: queryKeys.stats.total(), queryFn: () => repo.getTotalSecondsAllTime(), staleTime: 300_000 });
}
