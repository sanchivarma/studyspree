"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";

export function useActiveSession() {
  const client = useQueryClient();
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key !== null && !["ss_active", "ss_sessions"].includes(event.key)) return;
      void client.invalidateQueries({ queryKey: queryKeys.activeSession() });
      void client.invalidateQueries({ queryKey: queryKeys.stats.all() });
      void client.invalidateQueries({ queryKey: queryKeys.streak() });
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [client]);
  return useQuery({ queryKey: queryKeys.activeSession(), queryFn: () => repo.getActiveSession() });
}
