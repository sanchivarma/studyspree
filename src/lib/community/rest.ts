import {z} from 'zod';
import {communityCommandSchema,communityQuerySchema,type CommunityArea,type CommunityCommand} from './schemas';
import { requireRestMethod, RestRouteError } from './restRoutes';
const uuid=z.uuid();
/** Translate public REST names into the same validated commands used by the UI. Unknown keys remain and are rejected. */
export function restCommand(method:string,path:string[],input:unknown):CommunityCommand {
 requireRestMethod(path,method);
 const raw=z.record(z.string(),z.unknown()).parse(input);const data={...raw};const [resource,target,operation]=path;
 const attachId=()=>{if(data.id!==undefined&&data.id!==target)throw new RestRouteError(400);data.id=uuid.parse(target);};
 const rename=(from:string,to:string)=>{if(Object.hasOwn(data,from)){if(Object.hasOwn(data,to))throw new RestRouteError(400);data[to]=data[from];delete data[from];}};
 let action='';
 if(resource==='rooms'||resource==='spaces'){
  if(!target&&method==='POST'){action='room.create';rename('name','title');rename('description','body');data.body??='';data.private??=data.visibility!=='public'&&data.visibility!==undefined;data.category=data.category==='deep-focus'?'deep':data.category;}
  else {attachId();action=operation==='join'?'room.join':operation==='leave'?'room.leave':operation==='presence'?'room.heartbeat':operation==='invites'?'room.invite':method==='PATCH'?'room.update':'';}
 }else if(resource==='buddy-listings'){
  if(target)attachId();if(method==='DELETE')action='buddy.remove';else{action='buddy.save';rename('description','body');if(data.status!==undefined){data.published=data.status==='open';delete data.status;}data.published??=true;data.subjects??=[];}
 }else if(resource==='tasks'){
  action=method==='DELETE'?'task.delete':target?data.done!==undefined?'task.update':'task.edit':'task.create';if(target)attachId();rename('localDate','date');
 }else if(resource==='notifications'){attachId();action='notification.read';}
 else if(resource==='feedback'){action='feedback.create';rename('category','kind');}
 else if(resource==='conversations'){
  if(!target){action=data.targetId?'thread.direct':'thread.create';}
  else{attachId();action=operation==='messages'?'message.send':operation==='read'?'message.read':operation==='leave'?'thread.leave':'';rename('clientRequestId','clientId');}
 }else if(resource==='messages'){
  attachId();action=operation==='saved'?'message.save':method==='DELETE'?'message.remove':'message.edit';if(operation==='saved')data.value=method!=='DELETE';
 }else if(resource==='posts'){
  action=!target?'post.create':operation==='reactions'?'post.react':operation==='saved'?'post.save':operation==='replies'?'post.create':method==='DELETE'?'post.remove':'post.edit';
  if(target&&operation==='replies')data.parentId=uuid.parse(target);else if(target)attachId();rename('clientRequestId','clientId');
  if(operation==='saved')data.value=method!=='DELETE';if(operation==='reactions'&&method==='DELETE')data.emoji=null;
 }else if(resource==='groups'){
  if(!target){action='group.create';rename('name','title');rename('description','body');if(data.visibility!==undefined){data.private=data.visibility==='private';delete data.visibility;}}
  else{attachId();action=operation==='join'||operation==='requests'?'group.join':operation==='leave'?'group.leave':operation==='ownership'?'group.transfer':operation==='approve'?'group.approve':operation==='invites'?'group.invite':'group.update';rename('name','title');rename('description','body');rename('userId','targetId');}
 }else if(resource==='scheduled-sessions'){
  action=operation==='book'?'event.book':operation==='cancel-booking'?'event.unbook':operation==='start'?'event.start':method==='DELETE'?'event.cancel':target?'event.update':'event.create';if(target)attachId();
  rename('schedulingTimezone','timezone');
  if(data.endsAt!==undefined){const end=z.iso.datetime({offset:true}).parse(data.endsAt),start=z.iso.datetime({offset:true}).parse(data.startsAt);data.minutes=(Date.parse(end)-Date.parse(start))/60000;delete data.endsAt;}
 }else if(resource==='profile'&&target==='focus-partners'&&path[3]==='favourite'){
  action='partner.favourite';data.targetId=uuid.parse(path[2]);
 }
 if(!action)throw new Error('Unknown operation');
 return communityCommandSchema.parse({action,data});
}
export function restRead(path:string[],search:URLSearchParams):{area:CommunityArea;query:z.infer<typeof communityQuerySchema>} {
 requireRestMethod(path,'GET');
 const [resource,id,operation]=path;let area:CommunityArea;
 const query:Record<string,unknown>={};
 for(const key of ['q','cursor','filter','from','to','date','groupId','parentId'])if(search.has(key))query[key]=search.get(key);
 if(search.has('limit'))query.limit=Number(search.get('limit'));
 if(resource==='rooms'){area=operation==='participants'?'roomParticipants':'room';query.id=uuid.parse(id);}
 else if(resource==='public-sessions')area='publicSessions';
 else if(resource==='spaces')area='spaces';
 else if(resource==='buddy-listings')area='buddies';
 else if(resource==='conversations'){area=operation==='messages'?'messages':'conversations';if(id)query.id=uuid.parse(id);}
 else if(resource==='groups'){area='groups';if(id)query.id=uuid.parse(id);}
 else if(resource==='posts'&&operation==='replies'){area='feed';query.id=uuid.parse(id);}
 else if(resource==='feed'){area='feed';query.filter=search.get('view')??'following';}
 else if(resource==='scheduled-sessions'){area='schedule';if(id)query.id=uuid.parse(id);}
 else if(resource==='tasks'||resource==='notifications'||resource==='search')area=resource;
 else if(resource==='leaderboards'){area='leaderboards';query.metric=search.get('metric')==='best-streak'?'streak':'time';query.period=search.get('period')==='all-time'?'all':'week';}
 else if(resource==='profile'&&id==='focus-partners')area='partners';
 else throw new Error('Unknown resource');
 if(search.has('category'))query.filter=search.get('category')==='deep-focus'?'deep':search.get('category');
 return {area,query:communityQuerySchema.parse(query)};
}
