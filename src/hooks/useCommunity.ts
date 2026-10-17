"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { communityRepository } from "@/lib/repo/community";
import { queryKeys } from "@/lib/queryKeys";
import type { CommunityArea, CommunityQuery } from "@/lib/community/schemas";
export function useCommunity(area: CommunityArea, query: CommunityQuery = {}, enabled = true) {
    return useInfiniteQuery({ queryKey: queryKeys.community.read(area, query), queryFn: ({ pageParam }) => communityRepository.read(area, { ...query, cursor: pageParam }),
        initialPageParam: null as string | null, getNextPageParam: last => last.nextCursor, enabled, retry: false,
        refetchInterval: area === "publicSessions" || area === "room" || area === "roomParticipants" ? 15000 : area === "messages" || area === "roomChat" ? 3000 : area === "notifications" ? 30000 : false,
        refetchIntervalInBackground: false, staleTime: area === "messages" ? 0 : 10000 });
}
