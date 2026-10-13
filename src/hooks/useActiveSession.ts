"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";

export function useActiveSession() {
  return useQuery({ queryKey: queryKeys.activeSession(), queryFn: () => repo.getActiveSession() });
}
