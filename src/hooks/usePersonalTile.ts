"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import type { PersonalTile, TilePatch } from "@/lib/personalTile/schemas";
export function usePersonalTile() {
    const cache = useQueryClient();
    const key = queryKeys.personalTile();
    const query = useQuery({ queryKey: key, queryFn: () => repo.getPersonalTile() });
    const mutation = useMutation({ mutationFn: (patch: TilePatch) => repo.updatePersonalTile(patch), scope: { id: "personal-tile" },
        onMutate: async (patch) => { await cache.cancelQueries({ queryKey: key }); const previous = cache.getQueryData<PersonalTile>(key); if (previous)
            cache.setQueryData(key, { ...previous, ...patch }); return { previous }; },
        onError: (_e, _p, context) => { if (context?.previous)
            cache.setQueryData(key, context.previous); },
        onSuccess: value => { cache.setQueryData(key, value); void cache.invalidateQueries({ queryKey: queryKeys.tileHistory() }); void cache.invalidateQueries({queryKey:queryKeys.profile()}); },
    });
    return { ...query, mutation };
}
