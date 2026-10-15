"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileDirectory } from "@/lib/repo/profileDirectory";
import { queryKeys } from "@/lib/queryKeys";
import type { MediaKind } from "@/lib/profiles/schemas";
export function useProfileImageUpload() {
  const cache = useQueryClient();
  return useMutation({ mutationFn: ({ kind, file }: { kind: MediaKind; file: File }) => profileDirectory.upload(kind, file),
    onSuccess: value => { cache.setQueryData(queryKeys.directory.own(), value); void cache.invalidateQueries({ queryKey: queryKeys.directory.all() }); },
  });
}
