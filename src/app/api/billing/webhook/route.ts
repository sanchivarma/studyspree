import {createClient} from '@supabase/supabase-js';
import {HmacBillingAdapter} from '@/lib/entitlements/billing';
import type {Database} from '@/types/database';
/** Uses an explicitly configured, user-scoped billing worker; never a service-role client. */
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 const secret=process.env.BILLING_WEBHOOK_SECRET;
 if(process.env.BILLING_PROVIDER!=='custom-hmac'||!secret)return Response.json({error:'unconfigured'},{status:503,headers});
 const body=await request.text();if(body.length>8192)return Response.json({error:'invalid'},{status:400,headers});
 const adapter=new HmacBillingAdapter(secret);let event;
 try{event=adapter.verifyWebhook(body,request.headers.get('x-studyspree-signature')??'');}catch{return Response.json({error:'invalid'},{status:400,headers});}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,token=process.env.BILLING_WORKER_ACCESS_TOKEN;
 if(!url||!key||!token)return Response.json({error:'unconfigured'},{status:503,headers});
 const client=createClient<Database>(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const identity=await client.auth.getUser(token);if(identity.error||!identity.data.user)return Response.json({error:'unavailable'},{status:503,headers});
 const result=await client.rpc('apply_billing_event',{p_provider:'custom-hmac',p_event:event.id,p_hash:adapter.payloadHash(body),p_user:event.userId,p_feature:event.feature,p_enabled:event.enabled,p_valid_until:event.validUntil??undefined});
 if(result.error)return Response.json({error:'unavailable'},{status:503,headers});
 return Response.json({received:true,applied:result.data},{headers});
}
