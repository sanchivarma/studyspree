"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { profileDirectory } from "@/lib/repo/profileDirectory";
import { queryKeys } from "@/lib/queryKeys";
import type { OwnProfile, ProfileEdit } from "@/lib/profiles/schemas";
export function useEditOwnProfile() {
  const cache = useQueryClient(); const router = useRouter();
  return useMutation({ mutationFn: (input: ProfileEdit) => profileDirectory.update(input), scope: { id: "directory-edit" },
    onMutate: async patch => {
      await cache.cancelQueries({ queryKey: queryKeys.directory.all() });
      const previous = cache.getQueryData<OwnProfile>(queryKeys.directory.own());
      if (previous) cache.setQueryData(queryKeys.directory.own(), { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _input, context) => { if (context?.previous) cache.setQueryData(queryKeys.directory.own(), context.previous); },
    onSuccess: value => { cache.setQueryData(queryKeys.directory.own(), value); router.refresh(); },
    onSettled: () => { void cache.invalidateQueries({ queryKey: queryKeys.directory.all() }); void cache.invalidateQueries({ queryKey: queryKeys.profile() }); },
  });
}
