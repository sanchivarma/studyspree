"use client";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/useTranslation";
const links = ["spaces", "partners", "buddies", "conversations", "groups", "feed", "schedule", "leaderboards", "tasks", "notifications", "search", "feedback", "plans", "preferences"] as const;
export function MoreNav() { const { t } = useTranslation(); return <Sheet><SheetTrigger asChild><button aria-label={t("community.more")} type="button" className="flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl text-text-muted hover:bg-surface-2 md:w-11"><Menu className="size-5" aria-hidden="true"/><span className="text-[10px] md:sr-only">{t("community.more")}</span></button></SheetTrigger><SheetContent className="overflow-y-auto bg-background"><SheetHeader><SheetTitle>{t("community.more")}</SheetTitle><SheetDescription>{t("common.tagline")}</SheetDescription></SheetHeader><nav aria-label={t("community.more")} className="mt-6 grid gap-1">{links.map(page => <SheetClose key={page} asChild><Link href={`/${page}`} className="flex min-h-11 items-center rounded-xl px-4 hover:bg-surface-2">{t(`${page}.title`)}</Link></SheetClose>)}</nav></SheetContent></Sheet>; }
