"use client";
import {FeatureDrawer} from "@/components/layout/FeatureDrawer";
import {useMediaQuery} from "@/hooks/useMediaQuery";
import {useTranslation} from "@/hooks/useTranslation";
import {CommunityBoard} from "@/components/community/CommunityBoard";
import {Users} from "lucide-react";
export function SpacesSheet(){const desktop=useMediaQuery('(min-width:768px)');const {t}=useTranslation();return <FeatureDrawer title={t('spaces.title')} side={desktop?'left':'bottom'} trigger={<button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3"><Users className="size-4" aria-hidden="true"/>{t('spaces.title')}</button>}><CommunityBoard area="spaces" embedded/></FeatureDrawer>;}
