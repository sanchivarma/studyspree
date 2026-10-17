import type {Entitlement,EntitlementKey} from '@/types/entitlements';
export function checkEntitlement(entries:readonly Entitlement[],key:EntitlementKey){const item=entries.find(e=>e.key===key);return Boolean(item?.enabled&&(item.remainingSeconds===null||item.remainingSeconds>0));}
