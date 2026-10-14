"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

// Settings saves opt-in; camera acquisition belongs to the session consumer.
export function useSetWebcamEnabled() {
  const client = useQueryClient();
  return useMutation({
    scope: { id: "local-camera-preferences" },
    mutationFn: (webcamEnabled: boolean) => repo.updateProfile({ webcamEnabled }),
    onSuccess: profile => client.setQueryData(queryKeys.profile(), profile),
  });
}
