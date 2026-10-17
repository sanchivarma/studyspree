"use client";
import {useQuery} from '@tanstack/react-query';
import {entitlementRepository} from '@/lib/repo/entitlements';
import {queryKeys} from '@/lib/queryKeys';
import {useAccountMode} from './useAccountMode';
export function useEntitlements(){const mode=useAccountMode();return useQuery({queryKey:queryKeys.entitlements(),queryFn:()=>entitlementRepository.getEntitlements(),enabled:mode==='account',retry:false});}
