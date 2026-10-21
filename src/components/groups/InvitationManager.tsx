"use client";
import { useState } from "react";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { buttonClass } from "@/components/community/styles";
export function InvitationManager({ id, kind }: { id: string; kind:'group'|'room' }) {
 const {t,locale}=useTranslation();const list=useCommunity('invitations',{id,filter:kind});const mutation=useCommunityMutation();const [link,setLink]=useState('');
 return <section className="space-y-3"><h3>{t('roadmap.invitations')}</h3><button type="button" className={buttonClass} disabled={mutation.isPending} onClick={()=>mutation.mutate(kind==='group'?{action:'group.invite',data:{id}}:{action:'room.invite',data:{id,uses:10,hours:24}},{onSuccess:r=>setLink(`${window.location.origin}/invite/${r.token}`)})}>{t('community.invite')}</button>
 {link&&<input readOnly aria-label={t('calendar.shareLink')} value={link} onFocus={e=>e.currentTarget.select()} className="min-h-11 w-full rounded-xl border border-border bg-background px-3"/>}
 <ul>{list.data?.pages.flatMap(p=>p.items).map(inv=><li key={inv.id} className="flex flex-wrap items-center gap-3"><span>{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(String(inv.data.expiresAt)))}</span><button className={buttonClass} disabled={inv.data.revoked===true||mutation.isPending} onClick={()=>mutation.mutate({action:kind==='group'?'group.invite.revoke':'room.invite.revoke',data:{id:inv.id}})}>{t('roadmap.revoke')}</button></li>)}</ul>
 {(list.isError||mutation.isError)&&<p role="alert">{t('community.unavailable')}</p>}</section>;
}
