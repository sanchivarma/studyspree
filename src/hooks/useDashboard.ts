"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard(), queryFn: () => repo.getDashboard() });
}
