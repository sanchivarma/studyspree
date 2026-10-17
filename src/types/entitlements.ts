import {z} from 'zod';
export const entitlementKeys=['shared-room-access','detailed-history','group-chat','extended-partner-history']as const;
export type EntitlementKey=typeof entitlementKeys[number];
export const entitlementSchema=z.object({key:z.enum(entitlementKeys),enabled:z.boolean(),remainingSeconds:z.number().nonnegative().nullable(),resetsAt:z.iso.datetime({offset:true}).nullable()});
export type Entitlement=z.infer<typeof entitlementSchema>;
