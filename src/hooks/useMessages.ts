"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { subscribeToMessages } from "@/lib/community/realtime";
import { useAccountMode } from "./useAccountMode";
export function useMessages(threadId?: string) {
 const cache=useQueryClient();const mode=useAccountMode();
 useEffect(()=>{if(!threadId||mode!=='account')return;try{return subscribeToMessages(threadId,()=>{void cache.invalidateQueries({queryKey:queryKeys.community.all()});});}catch{/* Polling remains available if realtime is unavailable. */}},[cache,threadId,mode]);
}
