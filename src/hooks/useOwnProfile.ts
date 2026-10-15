"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { profileDirectory } from "@/lib/repo/profileDirectory";
import { queryKeys } from "@/lib/queryKeys";
import type { OwnProfile } from "@/lib/profiles/schemas";
export function useOwnProfile(initialData?: OwnProfile, isLocal = false) {
  return useQuery({ queryKey: queryKeys.directory.own(), queryFn: () => isLocal ? repo.getDirectoryProfile() : profileDirectory.getOwn(), initialData, retry: false });
}
