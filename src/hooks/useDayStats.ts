"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useDayStats(from: string, to: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.stats.days(from, to), queryFn: () => repo.getDayStats(from, to), staleTime: 300_000, enabled });
}
