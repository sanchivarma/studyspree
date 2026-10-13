"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile(), queryFn: () => repo.getProfile() });
}
