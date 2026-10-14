"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useStreak() {
  return useQuery({ queryKey: queryKeys.streak(), queryFn: () => repo.getStreak(), staleTime: 300_000 });
}
