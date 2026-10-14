"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

export function useSeedSessions() {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => repo.seedDemoSessions(), onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.stats.all() }),
      client.invalidateQueries({ queryKey: queryKeys.streak() }),
      client.invalidateQueries({ queryKey: queryKeys.activeSession() }),
    ]);
  } });
}
