"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect,useRef } from "react";
import { queryKeys } from "@/lib/queryKeys";
import { repo } from "@/lib/repo";
import { clearClientSelections } from "@/lib/session/clearClientSelections";

export function useActiveSession({ synchronize = false }: { synchronize?: boolean } = {}) {
  const client = useQueryClient();
  useEffect(() => {
    if (!synchronize) return;
    const refresh = (event: StorageEvent) => {
      if (event.key !== null && !["ss_active", "ss_sessions"].includes(event.key)) return;
      void client.invalidateQueries({ queryKey: queryKeys.activeSession() });
      void client.invalidateQueries({ queryKey: queryKeys.stats.all() });
      void client.invalidateQueries({ queryKey: queryKeys.streak() });
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [client, synchronize]);
  const isRemote=typeof document!=="undefined"&&Boolean(document.querySelector('[data-repository-mode="server"]'));
  // Load on mount and refresh after explicit session actions or cross-tab
  // changes. Idle pages must not schedule repeated repository reads.
  const result=useQuery({ queryKey: queryKeys.activeSession(), queryFn: () => repo.getActiveSession(),refetchInterval:false });
  const previous=useRef<string|null|undefined>(undefined);
  useEffect(()=>{
    if(!synchronize||!isRemote||result.isPending)return;
    const id=result.data?.id??null;
    if(previous.current!==undefined&&previous.current!==id){void client.invalidateQueries({queryKey:queryKeys.stats.all()});void client.invalidateQueries({queryKey:queryKeys.streak()});void client.invalidateQueries({queryKey:queryKeys.achievements()});}
    if (previous.current && !id) clearClientSelections(client, previous.current);
    previous.current=id;
  },[synchronize,isRemote,result.data,result.isPending,client]);
  return result;
}
