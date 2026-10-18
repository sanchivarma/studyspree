"use client";
import { useQuery } from "@tanstack/react-query";
import { useAccountMode } from "./useAccountMode";
import { queryKeys } from "@/lib/queryKeys";
import { musicIntegrationRepository } from "@/lib/repo/musicIntegration";
import { unavailableSpotify } from "@/types/musicIntegration";

export function useMusicIntegration() {
  const mode = useAccountMode();
  return useQuery({ queryKey: queryKeys.integrations.spotify(), queryFn: () => musicIntegrationRepository.getSpotifyState(),
    enabled: mode === "account", initialData: mode === "account" ? undefined : unavailableSpotify, retry: false });
}
