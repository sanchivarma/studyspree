"use client";
import { useEffect } from "react";
import { useCommunity } from "./useCommunity";
export function useRoomPresence(id:string,joined:boolean) {
 const query=useCommunity('roomParticipants',{id,limit:20},joined);
 const {hasNextPage,isFetchingNextPage,fetchNextPage}=query;
 useEffect(()=>{if(hasNextPage&&!isFetchingNextPage)void fetchNextPage();},[hasNextPage,isFetchingNextPage,fetchNextPage]);
 return query;
}
