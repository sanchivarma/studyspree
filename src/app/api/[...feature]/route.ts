import {z} from 'zod';
import {restCommand,restRead} from '@/lib/community/rest';
import {executeCommunity,CommunityServerError} from '@/lib/community/server';
import {executeStudy,StudyError} from '@/lib/repo/serverStudy';
import {hasClientDuration,repositoryRequestSchema} from '@/lib/repo/remoteSchemas';
import {serverProfileRepository,ProfileAccessError} from '@/lib/profiles/serverRepository';
import {profileEditSchema} from '@/lib/profiles/schemas';
import {statsRangeSchema} from '@/lib/stats/ranges';
type Context={params:Promise<{feature:string[]}>};
const headers={'Cache-Control':'private, no-store'};
async function handle(request:Request,context:Context){
 try{
  const path=(await context.params).feature;const url=new URL(request.url);const method=request.method;
  if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return Response.json({error:'forbidden'},{status:403,headers});
  const name=path.join('/');let result:unknown;
  if(method==='GET'){
   if(name==='dashboard')result=await executeStudy({op:'dashboard'});
   else if(name==='profile/achievements')result=await executeStudy({op:'earnedAchievements'});
   else if(name==='profile/character-history')result=await executeStudy({op:'characterHistory'});
   else if(name==='profile/tile-status'){const page=await executeStudy({op:'tileHistory',limit:1}) as {items:unknown[]};result=page.items[0]??null;}
   else if(name==='profile/tile-status/history')result=await executeStudy(repositoryRequestSchema.parse({op:'tileHistory',cursor:url.searchParams.get('cursor'),limit:Number(url.searchParams.get('limit')??20)}));
   else if(name==='sessions/history')result=await executeStudy(repositoryRequestSchema.parse({op:'history',query:{...Object.fromEntries(url.searchParams),limit:Number(url.searchParams.get('limit')??20)}}));
   else if(name==='stats/days'||name==='stats/summary'){
    const range=statsRangeSchema.parse(Object.fromEntries(url.searchParams));const days=await executeStudy({op:'days',...range});
    result=name==='stats/days'?days:(days as {totalSeconds:number;sessionCount:number}[]).reduce((a,b)=>({totalSeconds:a.totalSeconds+b.totalSeconds,sessionCount:a.sessionCount+b.sessionCount}),{totalSeconds:0,sessionCount:0});
   }else if(path[0]==='people'&&path.length===2)result=await serverProfileRepository.getPublic(path[1]);
   else result=await executeCommunity({operation:'read',...restRead(path,url.searchParams)});
  }else{
   const text=await request.text();if(text.length>32768)throw new SyntaxError();const raw:unknown=text?JSON.parse(text):{};
   if(hasClientDuration(raw))throw new SyntaxError();
   if(name==='profile/public'&&method==='PATCH'){const patch=profileEditSchema.partial().parse(raw);const current=await serverProfileRepository.getOwn();const base=Object.fromEntries(Object.keys(profileEditSchema.shape).map(key=>[key,Reflect.get(current,key)]));result=await serverProfileRepository.update(profileEditSchema.parse({...base,...patch}));}
   else if(name==='profile/tile-status'&&(method==='PUT'||method==='DELETE'))result=await executeStudy(repositoryRequestSchema.parse({op:'updateTile',patch:method==='DELETE'?{status:''}:{status:z.object({text:z.string().trim().max(200)}).strict().parse(raw).text}}));
   else if(path[0]==='people'&&path[2]==='follow'){
    // Public username resolution and privacy checks remain in the profile repository.
    const client=await import('@/lib/auth/server').then(m=>m.createAuthClient());const identity=await client.auth.getUser();if(!identity.data.user)throw new StudyError(401);
    const person=await client.rpc('read_visible_profile_by_id',{p_id:z.uuid().parse(path[1])});if(!person.data)throw new StudyError(404);
    result=await serverProfileRepository.follow(z.object({username:z.string()}).parse(person.data).username,method!=='DELETE');
   }else result=await executeCommunity({operation:'mutate',command:restCommand(method,path,raw)});
  }
  return Response.json(result,{headers});
 }catch(error){const status=error instanceof CommunityServerError?error.status:error instanceof StudyError?error.status:error instanceof ProfileAccessError?error.code==='unauthorized'?401:400:error instanceof z.ZodError||error instanceof SyntaxError?400:error instanceof Error&&error.message.startsWith('Unknown')?404:503;return Response.json({error:status===401?'accountRequired':status===403?'forbidden':status===400?'invalid':'unavailable'},{status,headers});}
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
