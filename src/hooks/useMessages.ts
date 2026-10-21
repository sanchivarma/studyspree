"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "./useAccountMode";
export function useMessages(threadId?: string) {
 const cache=useQueryClient();const mode=useAccountMode();
 useEffect(()=>{
  if(!threadId||mode!=='account')return;
  let disposed=false;let unsubscribe:(()=>void)|undefined;
  void import("@/lib/community/realtime").then(({subscribeToMessages})=>{
   if(disposed)return;
   unsubscribe=subscribeToMessages(threadId,()=>{
    void cache.invalidateQueries({queryKey:queryKeys.community.area("messages")});
    void cache.invalidateQueries({queryKey:queryKeys.community.area("conversations")});
   });
  }).catch(()=>{/* Polling remains available if realtime is unavailable. */});
  return()=>{disposed=true;unsubscribe?.();};
 },[cache,threadId,mode]);
}
