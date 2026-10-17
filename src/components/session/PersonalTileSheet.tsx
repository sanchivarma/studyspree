"use client";
import { Settings } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PersonalTileSettings } from "@/components/settings/PersonalTileSettings";
import { useTranslation } from "@/hooks/useTranslation";
export function PersonalTileSheet({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
 const { t } = useTranslation();
 return <Sheet onOpenChange={onOpenChange}><SheetTrigger asChild><button type="button" aria-label={t("personalTile.title")} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/60"><Settings className="size-4" aria-hidden="true"/></button></SheetTrigger>
 <SheetContent className="overflow-y-auto bg-surface"><SheetHeader><SheetTitle>{t("personalTile.title")}</SheetTitle><SheetDescription>{t("personalTile.privacy")}</SheetDescription></SheetHeader><PersonalTileSettings/></SheetContent></Sheet>;
}
