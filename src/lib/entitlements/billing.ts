import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {z} from 'zod';
import {now} from '@/lib/clock';
import {entitlementKeys} from '@/types/entitlements';
export const billingEventSchema=z.object({id:z.string().min(1).max(200),userId:z.uuid(),feature:z.enum(entitlementKeys),enabled:z.boolean(),validUntil:z.iso.datetime({offset:true}).nullable()}).strict();
export type BillingEvent=z.infer<typeof billingEventSchema>;
export interface BillingAdapter {verifyWebhook(body:string,signature:string):BillingEvent;payloadHash(body:string):string;}
/** A deployment may connect its provider bridge to this documented signed contract. No checkout is simulated. */
export class HmacBillingAdapter implements BillingAdapter {
 constructor(private readonly secret:string){}
 verifyWebhook(body:string,signature:string){
  const parts=/^(\d{10})\.([a-f0-9]{64})$/.exec(signature);
  if(!parts||Math.abs(now().getTime()/1000-Number(parts[1]))>300)throw new Error('Invalid signature');
  const expected=createHmac('sha256',this.secret).update(`${parts[1]}.${body}`).digest();const received=Buffer.from(parts[2],'hex');
  if(!timingSafeEqual(expected,received))throw new Error('Invalid signature');
  return billingEventSchema.parse(JSON.parse(body));
 }
 payloadHash(body:string){return createHash('sha256').update(body).digest('hex');}
}
