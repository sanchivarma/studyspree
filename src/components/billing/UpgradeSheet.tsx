"use client";
import {Sheet,SheetContent,SheetTrigger,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {UsageAllowance} from './UsageAllowance';
import {useTranslation} from '@/hooks/useTranslation';
export function UpgradeSheet(){const {t}=useTranslation();return <Sheet><SheetTrigger asChild><button className="min-h-11 rounded-xl border border-border px-4">{t('plans.title')}</button></SheetTrigger><SheetContent className="bg-surface"><SheetHeader><SheetTitle>{t('plans.title')}</SheetTitle><SheetDescription>{t('community.noCheckout')}</SheetDescription></SheetHeader><UsageAllowance/></SheetContent></Sheet>;}
