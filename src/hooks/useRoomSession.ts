"use client";
import {useEffect} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import {communityRepository} from "@/lib/repo/community";
import {repo} from "@/lib/repo";
import {queryKeys} from "@/lib/queryKeys";
import {invalidateCommunityMutation} from "@/lib/community/queryInvalidation";
import type {CharacterSlug} from "@/types/characters";
export function useRoomSession(id:string,joined:boolean,themeSlug:string,characters:CharacterSlug[],goal=""){
 const cache=useQueryClient();
 const join=useMutation({mutationFn:async()=>{
  await communityRepository.mutate({action:"room.join",data:{id,goal}});
  try{
   const companions={mode:characters.length?"mixed" as const:"people" as const,characterSlugs:characters};
   const session=await repo.startSession({plannedMinutes:null,themeSlug,task:goal.trim()||null,companions,roomId:id});
   if(session.companions.mode!==companions.mode||session.companions.characterSlugs.length!==characters.length||characters.some((slug,index)=>session.companions.characterSlugs[index]!==slug))return await repo.updateSessionCompanions(session.id,companions);
   return session;
  }catch(error){await communityRepository.mutate({action:"room.leave",data:{id}});throw error;}
 },onSuccess:session=>{cache.setQueryData(queryKeys.activeSession(),session);invalidateCommunityMutation(cache,{action:"room.join",data:{id}});}});
 const leave=async()=>{await communityRepository.mutate({action:"room.leave",data:{id}});invalidateCommunityMutation(cache,{action:"room.leave",data:{id}});};
 useEffect(()=>{
  if(!joined)return;
  const beat=()=>void communityRepository.mutate({action:"room.heartbeat",data:{id}}).then(()=>invalidateCommunityMutation(cache,{action:"room.heartbeat",data:{id}})).catch(()=>{});
  const interval=window.setInterval(beat,30000);const visible=()=>{if(!document.hidden)beat();};
  document.addEventListener("visibilitychange",visible);
  return()=>{clearInterval(interval);document.removeEventListener("visibilitychange",visible);};
 },[joined,id,cache]);
 return {join,leave};
}
