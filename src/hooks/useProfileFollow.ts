"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileDirectory } from "@/lib/repo/profileDirectory";
import { queryKeys } from "@/lib/queryKeys";
import type { PublicProfile } from "@/lib/profiles/schemas";
export function useProfileFollow(username: string) {
  const cache = useQueryClient(); const key = queryKeys.directory.public(username);
  return useMutation({ mutationFn: (following: boolean) => profileDirectory.follow(username, following),
    onMutate: async following => {
      await cache.cancelQueries({ queryKey: key });
      const previous = cache.getQueryData<PublicProfile | null>(key);
      if (previous) cache.setQueryData(key, { ...previous, isFollowing: following,
        followers: Math.max(0, previous.followers + (following === previous.isFollowing ? 0 : following ? 1 : -1)) });
      return { previous };
    },
    onError: (_error, _value, context) => { if (context) cache.setQueryData(key, context.previous); },
    onSuccess: value => cache.setQueryData(key, value),
    onSettled: () => { void cache.invalidateQueries({ queryKey: queryKeys.directory.all() }); },
  });
}
