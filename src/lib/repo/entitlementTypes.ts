import type {Entitlement} from '@/types/entitlements';
export interface EntitlementRepository {getEntitlements():Promise<Entitlement[]>;}
