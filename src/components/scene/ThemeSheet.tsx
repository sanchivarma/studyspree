"use client";

import { useRef, useState, type CSSProperties, type ReactElement } from "react";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { themes, getTheme } from "@/lib/themes/registry";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useProfile } from "@/hooks/useProfile";
import { useSelectTheme } from "@/hooks/useSelectTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { cn } from "@/lib/utils";
import { ThemeGrid } from "./ThemeGrid";

export { themeCopy } from "./ThemeGrid";

export function ThemeSheet({ children, onOpenChange }: { children: ReactElement; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const desktop = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useReducedMotion();
  const visible = usePageVisibility();
  const profile = useProfile();
  const selection = useSelectTheme();
  const selected = getTheme(profile.data?.selectedTheme ?? "rain-desk");
  const { t } = useTranslation();
  const changeOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return <>
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side={desktop ? "right" : "bottom"} showCloseButton={false}
        style={{ "--accent": selected.accentColor, animationPlayState: visible ? "running" : "paused" } as CSSProperties}
        data-testid="theme-sheet" data-side={desktop ? "right" : "bottom"}
        data-theme-picker=""
        data-reduced-motion={reducedMotion} data-page-visible={visible}
        className={cn("max-h-dvh overflow-y-auto bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-[opacity,transform]", desktop ? "w-[440px] sm:max-w-[440px]" : "rounded-t-2xl", reducedMotion && "!animate-none !transition-none")}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cards.current[themes.findIndex((theme) => theme.slug === selected.slug)]?.focus();
        }}>
        <SheetHeader className="p-0 pr-12">
          <SheetTitle className="text-[20px]">{t("scene.title")}</SheetTitle>
          <SheetDescription>{t("scene.description")}</SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <button type="button" aria-label={t("scene.close")} className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-xl text-text-muted hover:bg-surface">
            <X aria-hidden="true" className="size-5" />
          </button>
        </SheetClose>
        <ThemeGrid selectedTheme={selected.slug} cardRefs={cards} onSelect={slug => { selection.mutate(slug); changeOpen(false); }} />
      </SheetContent>
    </Sheet>
    {selection.error && <p role="alert" className="fixed right-4 bottom-16 z-40 max-w-xs rounded-xl border border-border bg-surface p-3 text-small text-foreground">{t("scene.saveError")}</p>}
  </>;
}
