"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { CompanionPreferences } from "@/types/characters";

export function useSessionCompanions(id: string) {
  const client = useQueryClient();
  return useMutation({
    scope: { id: `session-companions-${id}` },
    mutationFn: (value: CompanionPreferences) => repo.updateSessionCompanions(id, value),
    onSuccess: session => client.setQueryData(queryKeys.activeSession(), session),
  });
}
