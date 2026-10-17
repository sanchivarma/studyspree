"use client";
import { usePendingDeliveries } from "@/hooks/usePendingDeliveries";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { buttonClass } from "@/components/community/CommunityComposer";
export function PendingDeliveries({ area,id,groupId,knownIds }: {area:'feed'|'messages';id?:string;groupId?:string;knownIds:string[]}) {
 const states=usePendingDeliveries();const retry=useCommunityMutation();const {t}=useTranslation();
 const relevant=states.filter(s=>s.command?.action===(area==='feed'?'post.create':'message.send')).sort((a,b)=>a.submittedAt-b.submittedAt);
 const latest=new Map(relevant.flatMap(s=>s.command&&(s.command.action==='post.create'||s.command.action==='message.send')&&s.command.data.clientId?[[s.command.data.clientId,s]as const]:[]));
 return <div aria-live="polite" className="space-y-3">{[...latest].map(([key,s])=>{
  const command=s.command;if(!command||(command.action!=='post.create'&&command.action!=='message.send'))return null;
  if(command.action==='message.send'?command.data.id!==id:command.data.groupId!==groupId||command.data.parentId!==id)return null;
  if(s.result&&knownIds.includes(s.result.id))return null;
  return <article key={key} className="rounded-xl border border-border p-4"><p className="whitespace-pre-wrap">{command.data.body}</p><p className="text-small text-text-muted">{t(s.status==='error'?'roadmap.deliveryError':s.status==='success'?'roadmap.sent':'roadmap.pending')}</p>{s.status==='error'&&<button className={buttonClass} disabled={retry.isPending} onClick={()=>retry.mutate(command)}>{t('roadmap.retry')}</button>}</article>;
 })}</div>;
}
