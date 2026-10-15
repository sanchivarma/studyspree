"use client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { profileDirectory } from "@/lib/repo/profileDirectory";
import type { PublicProfile } from "@/lib/profiles/schemas";
export function usePublicProfile(username: string, initialData?: PublicProfile | null) {
  return useQuery({ queryKey: queryKeys.directory.public(username), queryFn: () => profileDirectory.getPublic(username), initialData, retry: false });
}
