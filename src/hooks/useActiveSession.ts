"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect,useRef } from "react";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";

export function useActiveSession() {
  const client = useQueryClient();
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key !== null && !["ss_active", "ss_sessions"].includes(event.key)) return;
      void client.invalidateQueries({ queryKey: queryKeys.activeSession() });
      void client.invalidateQueries({ queryKey: queryKeys.stats.all() });
      void client.invalidateQueries({ queryKey: queryKeys.streak() });
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [client]);
  const isRemote=typeof document!=="undefined"&&Boolean(document.querySelector('[data-repository-mode="server"]'));
  const result=useQuery({ queryKey: queryKeys.activeSession(), queryFn: () => repo.getActiveSession(),refetchInterval:isRemote?5000:false,refetchIntervalInBackground:false });
  const previous=useRef<string|null|undefined>(undefined);
  useEffect(()=>{
    if(!isRemote||result.isPending)return;
    const id=result.data?.id??null;
    if(previous.current!==undefined&&previous.current!==id){void client.invalidateQueries({queryKey:queryKeys.stats.all()});void client.invalidateQueries({queryKey:queryKeys.streak()});void client.invalidateQueries({queryKey:queryKeys.achievements()});}
    previous.current=id;
  },[isRemote,result.data,result.isPending,client]);
  return result;
}
