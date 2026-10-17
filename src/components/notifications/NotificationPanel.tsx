"use client";
import { useState } from "react";
import { Bell } from "lucide-react";
import { FeatureDrawer } from "@/components/layout/FeatureDrawer";
import { CommunityBoard } from "@/components/community/CommunityBoard";
import { useTranslation } from "@/hooks/useTranslation";
export function NotificationPanel(){const {t}=useTranslation();const [open,setOpen]=useState(false);return <FeatureDrawer title={t('notifications.title')} open={open} onOpenChange={setOpen} trigger={<button type="button" aria-label={t('notifications.title')} className="flex size-11 items-center justify-center rounded-xl"><Bell className="size-5" aria-hidden="true"/></button>}>{open&&<CommunityBoard area="notifications" embedded/>}</FeatureDrawer>;}
