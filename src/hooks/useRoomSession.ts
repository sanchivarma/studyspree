"use client";
import {useEffect} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import {communityRepository} from "@/lib/repo/community";
import {repo} from "@/lib/repo";
import {queryKeys} from "@/lib/queryKeys";
import type {CharacterSlug} from "@/types/characters";
export function useRoomSession(id:string,joined:boolean,themeSlug:string,characters:CharacterSlug[]){
 const cache=useQueryClient();
 const join=useMutation({mutationFn:async()=>{
  await communityRepository.mutate({action:"room.join",data:{id}});
  try{
   const companions={mode:characters.length?"mixed" as const:"people" as const,characterSlugs:characters};
   const session=await repo.startSession({plannedMinutes:null,themeSlug,task:null,companions});
   await repo.updateSessionCompanions(session.id,companions);
  }catch(error){await communityRepository.mutate({action:"room.leave",data:{id}});throw error;}
 },onSuccess:()=>{void cache.invalidateQueries({queryKey:queryKeys.community.all()});void cache.invalidateQueries({queryKey:queryKeys.activeSession()});}});
 const leave=async()=>{await communityRepository.mutate({action:"room.leave",data:{id}});await cache.invalidateQueries({queryKey:queryKeys.community.all()});};
 useEffect(()=>{
  if(!joined)return;
  const beat=()=>void communityRepository.mutate({action:"room.heartbeat",data:{id}}).then(()=>cache.invalidateQueries({queryKey:queryKeys.community.all()})).catch(()=>{});
  const interval=window.setInterval(beat,30000);const visible=()=>{if(!document.hidden)beat();};
  document.addEventListener("visibilitychange",visible);
  return()=>{clearInterval(interval);document.removeEventListener("visibilitychange",visible);};
 },[joined,id,cache]);
 return {join,leave};
}
