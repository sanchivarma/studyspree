"use client";
import { z } from "zod";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { communityRepository } from "@/lib/repo/community";
import type { CommunityState } from "@/lib/community/schemas";
import { roomControlsSchema, type RoomControls } from "@/lib/community/roomControls";

export function useUpdateRoomControls(id: string) {
  const cache = useQueryClient();
  const key = queryKeys.community.read("room", { id });
  return useMutation({
    scope: { id: `room-controls:${id}` },
    mutationFn: (controls: RoomControls) => communityRepository.mutate({ action: "room.controls", data: { id, controls: roomControlsSchema.parse(controls) } }),
    onMutate: async controls => {
      await cache.cancelQueries({ queryKey: key });
      const previous = cache.getQueryData<InfiniteData<CommunityState>>(key);
      cache.setQueryData<InfiniteData<CommunityState>>(key, current => current ? { ...current, pages: current.pages.map(page => ({ ...page, context: { ...page.context, controls: z.json().parse(controls) } })) } : current);
      return { previous };
    },
    onError: (_error, _input, context) => { if (context?.previous) cache.setQueryData(key, context.previous); },
    onSettled: () => {
      void cache.invalidateQueries({ queryKey: key });
      void cache.invalidateQueries({ queryKey: queryKeys.community.area("publicSessions") });
    },
  });
}
