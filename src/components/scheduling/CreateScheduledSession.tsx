"use client";
import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { useProfile } from "@/hooks/useProfile";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { communityCommandSchema, type CommunityItem } from "@/lib/community/schemas";
import { resolveCalendarTime } from "@/lib/community/calendar";
import { CharacterPicker } from "@/components/characters/CharacterPicker";
import type { CharacterSlug } from "@/types/characters";
import { characterSlugs } from "@/types/characters";
import { fieldClass, buttonClass } from "@/components/community/CommunityComposer";
export function CreateScheduledSession({ groupId, event }: { groupId?: string; event?: CommunityItem }) {
 const profile = useProfile(); const mutation = useCommunityMutation(); const { t } = useTranslation();
 const [mode, setMode] = useState(event?.data.mode === "private-characters" ? "private-characters" : "people");
 const [selected, setSelected] = useState<CharacterSlug[]>(characterSlugs.filter(slug => Array.isArray(event?.data.characterSlugs) && event.data.characterSlugs.includes(slug)));
 const [invalid, setInvalid] = useState(false);
 const zone = String(event?.data.schedulingTimezone ?? profile.data?.timezone ?? "UTC");
 return <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={e => {
  e.preventDefault();setInvalid(false);const form = new FormData(e.currentTarget);
  try {
   const timezone = String(form.get('timezone'));
   const data = { title: String(form.get('title')), startsAt: resolveCalendarTime(String(form.get('startsAt')), timezone, form.get('occurrence')==='later'?'later':'earlier'), minutes: Number(form.get('minutes')), capacity: mode==='private-characters'?1:Number(form.get('capacity')), timezone, mode, characterSlugs: mode==='private-characters'?selected:[], ...(!event&&groupId?{groupId}:{}) };
   const command = communityCommandSchema.parse(event ? { action:'event.update', data:{...data,id:event.id} } : {action:'event.create',data});
   mutation.mutate(command);
  } catch {setInvalid(true);}
 }}>
 <label className="block">{t('community.title')}<input name="title" required maxLength={100} defaultValue={event?.title} className={fieldClass}/></label>
 <label className="block">{t('roadmap.schedulingTimezone')}<input name="timezone" required maxLength={100} key={zone} defaultValue={zone} className={fieldClass}/></label>
 <label className="block">{t('community.startsAt')}<input name="startsAt" type="datetime-local" required defaultValue={event?formatInTimeZone(String(event.data.startsAt),zone,"yyyy-MM-dd'T'HH:mm"):undefined} className={fieldClass}/></label>
 <label className="block">{t('community.dstChoice')}<select name="occurrence" className={fieldClass}><option value="earlier">{t('community.earlier')}</option><option value="later">{t('community.later')}</option></select></label>
 <label className="block">{t('community.minutes')}<select name="minutes" defaultValue={String(event?.data.minutes??30)} className={fieldClass}><option value="30">30</option><option value="60">60</option></select></label>
 <label className="block">{t('characters.title')}<select disabled={Boolean(event)||Boolean(groupId)} value={mode} onChange={e=>setMode(e.target.value)} className={fieldClass}><option value="people">{t('characters.people')}</option><option value="private-characters">{t('roadmap.privateCharacters')}</option></select></label>
 {mode==='private-characters'?<CharacterPicker selected={selected} onChange={setSelected}/>:<label className="block">{t('community.capacity')}<input name="capacity" required type="number" min={1} max={1000} defaultValue={Number(event?.data.capacity??12)} className={fieldClass}/></label>}
 {(invalid||mutation.isError)&&<p role="alert">{t(invalid?'community.invalidTime':'community.unavailable')}</p>}
 {mutation.isSuccess&&<p role="status">{t('community.savedNotice')}</p>}
 <button type="submit" disabled={mutation.isPending} className={buttonClass}>{t(event?'community.save':'community.create')}</button>
 </form>;
}
