"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { FeatureDrawer } from "@/components/layout/FeatureDrawer";
import dynamic from "next/dynamic";
import { LoadingPanel } from "@/components/layout/LoadingPanel";
const CommunityBoard = dynamic(() => import("@/components/community/CommunityBoard").then(module => module.CommunityBoard), { loading: LoadingPanel });
import { useTranslation } from "@/hooks/useTranslation";
export function GlobalSearchDialog(){const {t}=useTranslation();const [open,setOpen]=useState(false);return <FeatureDrawer title={t('search.title')} open={open} onOpenChange={setOpen} trigger={<button type="button" aria-label={t('search.title')} className="flex size-11 items-center justify-center rounded-xl"><Search className="size-5" aria-hidden="true"/></button>}>{open&&<CommunityBoard area="search" embedded/>}</FeatureDrawer>;}
