"use client";
import Link from "next/link";
import { navigationItems } from "@/lib/navigation/routes";
import { NineDotIcon } from "./NineDotIcon";
import {SheetClose} from '@/components/ui/sheet';
import {FeatureDrawer} from './FeatureDrawer';
import { useTranslation } from "@/hooks/useTranslation";
const links = navigationItems.filter(item=>!item.primary);
export function MoreNav() { const { t } = useTranslation(); return <FeatureDrawer title={t('community.more')} trigger={<button aria-label={t("community.more")} type="button" className="relative flex h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl leading-none text-text-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent md:w-11 md:gap-0"><NineDotIcon/><span className="text-[10px] md:sr-only">{t("community.more")}</span></button>}><nav aria-label={t("community.more")} className="grid gap-1">{links.map(item => <SheetClose key={item.id} asChild><Link prefetch={false} href={item.href} className="flex min-h-11 items-center rounded-xl px-4 hover:bg-surface-2">{t(item.labelKey)}</Link></SheetClose>)}</nav></FeatureDrawer>; }
