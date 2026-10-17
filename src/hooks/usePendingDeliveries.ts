"use client";
import { useMutationState } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { CommunityCommand } from "@/lib/community/schemas";
export function usePendingDeliveries() {
 return useMutationState({filters:{mutationKey:queryKeys.delivery()},select:m=>({command:m.state.variables as CommunityCommand|undefined,status:m.state.status,submittedAt:m.state.submittedAt,result:m.state.data as {id:string}|undefined})});
}
