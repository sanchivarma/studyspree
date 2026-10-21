"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useSession(id: string, enabled = true) {
  const remote=typeof document!=="undefined"&&Boolean(document.querySelector('[data-repository-mode="server"]'));
  return useQuery({ queryKey: queryKeys.stats.session(id), queryFn: () => repo.getSession(id), enabled,
    refetchInterval: query => remote && query.state.data?.endedAt === null ? 5000 : false, refetchIntervalInBackground:false });
}
