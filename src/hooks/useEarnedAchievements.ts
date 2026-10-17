"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
export function useEarnedAchievements() { return useQuery({ queryKey: queryKeys.earnedAchievements(), queryFn: () => repo.getEarnedAchievements() }); }
