"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
export function useTileStatusHistory() { return useInfiniteQuery({ queryKey: queryKeys.tileHistory(), initialPageParam: null as string | null, queryFn: ({ pageParam }) => repo.getTileStatusHistory({ cursor: pageParam, limit: 20 }), getNextPageParam: page => page.nextCursor }); }
