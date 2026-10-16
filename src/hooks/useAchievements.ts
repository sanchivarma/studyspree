"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
export function useAchievements() { return useQuery({ queryKey: queryKeys.achievements(), queryFn: () => repo.getAchievements() }); }
