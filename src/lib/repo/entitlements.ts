import {z} from 'zod';
import {entitlementSchema} from '@/types/entitlements';
import type {EntitlementRepository} from './entitlementTypes';
import {CommunityError} from './community';
export const entitlementRepository:EntitlementRepository={async getEntitlements(){const response=await fetch('/api/entitlements',{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new CommunityError(response.status===401?'accountRequired':'unavailable');return z.array(entitlementSchema).parse(await response.json());}};
