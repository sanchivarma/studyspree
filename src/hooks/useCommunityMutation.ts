"use client";
import { useMutation, useQueryClient,type InfiniteData } from "@tanstack/react-query";
import { communityRepository } from "@/lib/repo/community";
import type { CommunityCommand,CommunityState } from "@/lib/community/schemas";
import { queryKeys } from "@/lib/queryKeys";
export function useCommunityMutation() {
    const cache = useQueryClient();
    return useMutation({ mutationKey:queryKeys.delivery(),mutationFn: (input: CommunityCommand) => communityRepository.mutate(input),scope:{id:"community-write"},
        onMutate:async command=>{
            await cache.cancelQueries({queryKey:queryKeys.community.all()});
            const previous=cache.getQueriesData<InfiniteData<CommunityState>>({queryKey:queryKeys.community.all()});
            for(const [key,value] of previous){if(!value)continue;cache.setQueryData(key,{...value,pages:value.pages.map(page=>{
                let context=page.context;
                if(command.action==="preferences")context={...context,...(command.data.allowMessages!==undefined?{allowMessages:command.data.allowMessages}:{}),...(command.data.leaderboardOptIn!==undefined?{optedIn:command.data.leaderboardOptIn,leaderboardOptIn:command.data.leaderboardOptIn}:{})};
                const items=page.items.map(item=>{
                    if(command.action==="task.update"&&item.id===command.data.id)return {...item,data:{...item.data,done:command.data.done}};
                    if(command.action==="partner.set"&&item.id===command.data.targetId)return {...item,data:{...item.data,favorite:command.data.favorite,notify:command.data.notify}};
                    if((command.action==="message.save"||command.action==="post.save")&&item.id===command.data.id)return {...item,data:{...item.data,saved:command.data.value}};
                    return item;
                });
                return {...page,context,items};
            })});}
            return {previous};
        },
        onError:(_error,_command,context)=>{for(const [key,value] of context?.previous??[])if(value)cache.setQueryData(key,value);},
        onSettled: () => { void cache.invalidateQueries({ queryKey: queryKeys.community.all() }); void cache.invalidateQueries({ queryKey: queryKeys.dashboard() }); } });
}
