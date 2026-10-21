"use client";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { communityCommandSchema, type CommunityItem } from "@/lib/community/schemas";
import { buttonClass, fieldClass } from "@/components/community/styles";
import { useState } from "react";
export function BuddyListingForm({ listing }: { listing?: CommunityItem }) {
 const {t}=useTranslation();const profile=useProfile();const mutation=useCommunityMutation();const [invalid,setInvalid]=useState(false);
 return <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);const text=(key:string)=>String(f.get(key)??'');
  const command=communityCommandSchema.safeParse({action:'buddy.save',data:{title:text('title'),body:text('body'),subjects:text('subjects').split(',').map(v=>v.trim()).filter(Boolean),published:f.get('published')==='on',category:text('category'),timezone:text('timezone'),availability:text('availability')}});
  setInvalid(!command.success);if(command.success)mutation.mutate(command.data);
 }}>
 {(['title','body','subjects'] as const).map(key=><label className="block" key={key}>{t(`community.${key}`)}{key==='body'?<textarea name={key} required maxLength={4000} defaultValue={listing?.body} className={fieldClass}/>:<input name={key} required={key==='title'} maxLength={key==='title'?100:410} defaultValue={key==='title'?listing?.title:Array.isArray(listing?.data.subjects)?listing.data.subjects.join(', '):''} className={fieldClass}/>}</label>)}
 <label className="block">{t('roadmap.category')}<select name="category" defaultValue={String(listing?.data.category??'other')} className={fieldClass}>{(['student','professional','other']as const).map(v=><option key={v} value={v}>{t(`roadmap.${v}`)}</option>)}</select></label>
 <label className="block">{t('community.timezone')}<input name="timezone" required maxLength={100} key={profile.data?.timezone} defaultValue={String(listing?.data.timezone??profile.data?.timezone??'UTC')} className={fieldClass}/></label>
 <label className="block">{t('roadmap.availability')}<input name="availability" maxLength={500} defaultValue={String(listing?.data.availability??'')} className={fieldClass}/></label>
 <label className="flex min-h-11 items-center gap-2"><input name="published" type="checkbox" defaultChecked={listing?listing.data.published===true:true}/>{t('community.publish')}</label>
 {(invalid||mutation.isError)&&<p role="alert">{t('community.unavailable')}</p>}{mutation.isSuccess&&<p role="status">{t('community.savedNotice')}</p>}
 <button className={buttonClass} disabled={mutation.isPending}>{t(listing?'community.save':'community.create')}</button>
 </form>;
}
