"use client";
import {useEntitlements} from '@/hooks/useEntitlements';
import {useTranslation} from '@/hooks/useTranslation';
import {formatDuration} from '@/lib/stats/presentation';
export function UsageAllowance(){const query=useEntitlements();const {t,locale}=useTranslation();const room=query.data?.find(e=>e.key==='shared-room-access');return <section className="rounded-xl border border-border p-4">{room&&<p>{room.remainingSeconds===null?t('community.unconfigured'):`${t('community.remaining')}: ${formatDuration(room.remainingSeconds,locale)}`}</p>}{query.isError&&<p role="alert">{t('community.unavailable')}</p>}<p>{t('community.noCheckout')}</p></section>;}
