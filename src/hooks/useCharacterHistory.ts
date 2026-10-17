"use client";
import { useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
export function useCharacterHistory() { return useQuery({ queryKey: queryKeys.characterHistory(), queryFn: () => repo.getCharacterCompanionHistory() }); }
