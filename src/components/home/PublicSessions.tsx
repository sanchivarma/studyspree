"use client";
import Link from 'next/link';
import {useCommunity} from '@/hooks/useCommunity';
import {useAccountMode} from '@/hooks/useAccountMode';
import {useTranslation} from '@/hooks/useTranslation';
export function PublicSessions(){
 const mode=useAccountMode();const {t}=useTranslation();const query=useCommunity('publicSessions',{limit:20},mode==='account');
 const items=[...new Map(query.data?.pages.flatMap(p=>p.items).map(item=>[item.id,item])??[]).values()];
 return <section className="mt-6 rounded-2xl border border-border bg-surface/90 p-5"><h2 className="text-xl">{t('sessionSetup.publicSessions')}</h2>
 {mode==='preview'?<p className="mt-3 text-small text-text-muted">{t('sessionSetup.previewPublic')}</p>:query.isError?<p role="alert">{t('community.unavailable')}</p>:query.isPending?<p role="status">{t('community.loading')}</p>:items.length===0?<p className="mt-3 text-text-muted">{t('sessionSetup.empty')}</p>:<ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map(item=><li key={item.id} className="space-y-2 rounded-xl border border-border p-4"><h3 className="font-semibold">{item.title}</h3>{item.body&&<p className="line-clamp-3 whitespace-pre-wrap text-small">{item.body}</p>}<p className="text-small text-text-muted">{t('community.peopleOnline',{n:Number(item.data.humanCount??0)})}</p><Link className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-background" href={`/rooms/${item.id}`}>{t('community.join')}</Link></li>)}</ul>}
 {query.hasNextPage&&<button className="mt-3 min-h-11 rounded-xl border border-border px-4" disabled={query.isFetchingNextPage} onClick={()=>void query.fetchNextPage()}>{t('community.loadMore')}</button>}
 </section>;
}
