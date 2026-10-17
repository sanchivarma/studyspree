"use client";
import { useCommunity } from "@/hooks/useCommunity";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useProfile } from "@/hooks/useProfile";
import { useLocalDate } from "@/hooks/useLocalDate";
import { useTranslation } from "@/hooks/useTranslation";
import { CommunityCard } from "@/components/community/CommunityCard";
import { CommunityComposer } from "@/components/community/CommunityComposer";
export function TodayTasks() {
 const mode=useAccountMode();const profile=useProfile();const date=useLocalDate(profile.data?.timezone);const {t}=useTranslation();
 const query=useCommunity('tasks',{date:date??undefined},mode==='account'&&Boolean(date));const state=query.data?.pages[0];
 if(mode!=='account')return null;
 return <section className="mt-6 space-y-3 rounded-2xl border border-border bg-surface p-4"><h2>{t('tasks.title')}</h2>
 <CommunityComposer area="tasks"/>
 {query.isError&&<p role="alert">{t('community.unavailable')}</p>}{query.isPending&&<p role="status">{t('community.loading')}</p>}
 {!query.isPending&&state?.items.length===0&&<p>{t('community.empty')}</p>}
 {query.data?.pages.flatMap(p=>p.items).map(item=><CommunityCard key={item.id} area="tasks" item={item} viewerId={state?.viewerId??''} timezone={profile.data?.timezone??'UTC'}/>)}
 {query.hasNextPage&&<button className="min-h-11 px-4" onClick={()=>void query.fetchNextPage()}>{t('community.loadMore')}</button>}
 </section>;
}
