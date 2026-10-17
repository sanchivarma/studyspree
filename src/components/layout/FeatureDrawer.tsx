"use client";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/useTranslation";
export function FeatureDrawer({ title, trigger, children, open, onOpenChange, side='right' }: { title:string;trigger:ReactNode;children:ReactNode;open?:boolean;onOpenChange?:(value:boolean)=>void;side?:'left'|'right'|'bottom' }) {
 const {t}=useTranslation();
 return <Sheet open={open} onOpenChange={onOpenChange}><SheetTrigger asChild>{trigger}</SheetTrigger>
 <SheetContent side={side} showCloseButton={false} className="max-h-dvh gap-0 overflow-hidden bg-surface p-0 motion-reduce:animate-none sm:max-w-xl">
  <div className="relative z-10 shrink-0 border-b border-border bg-surface">
   <SheetHeader className="min-h-16 pr-16"><SheetTitle>{title}</SheetTitle><SheetDescription>{t('common.tagline')}</SheetDescription></SheetHeader>
   <SheetClose asChild><button type="button" aria-label={t('scene.close')} className="absolute top-2 right-2 z-20 flex size-11 items-center justify-center rounded-xl bg-surface-2 text-foreground focus-visible:outline-2 focus-visible:outline-accent"><X aria-hidden="true" className="size-5"/></button></SheetClose>
  </div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
 </SheetContent></Sheet>;
}
