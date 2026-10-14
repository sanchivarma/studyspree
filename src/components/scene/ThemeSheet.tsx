"use client";

import { useRef, useState, type CSSProperties, type ReactElement } from "react";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { themes, getTheme, type ThemeSlug } from "@/lib/themes/registry";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useProfile } from "@/hooks/useProfile";
import { useSelectTheme } from "@/hooks/useSelectTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import type { TranslationKey } from "@/translations";
import { cn } from "@/lib/utils";
import { SceneVideo } from "./SceneVideo";

export const themeCopy: Record<ThemeSlug, { name: TranslationKey; description: TranslationKey }> = {
  "rain-desk": { name: "stats.rainDesk", description: "scene.rainDeskDescription" },
  "night-shift": { name: "stats.nightShift", description: "scene.nightShiftDescription" },
  "balcony-dusk": { name: "stats.balconyDusk", description: "scene.balconyDuskDescription" },
  "dorm-bunk": { name: "stats.dormBunk", description: "scene.dormBunkDescription" },
};

export function ThemeSheet({ children, onOpenChange }: { children: ReactElement; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<ThemeSlug | null>(null);
  const [focusSlug, setFocusSlug] = useState<ThemeSlug | null>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const desktop = useMediaQuery("(min-width: 768px)");
  const canHover = useMediaQuery("(min-width: 768px) and (hover: hover) and (pointer: fine)");
  const reducedMotion = useReducedMotion();
  const visible = usePageVisibility();
  const profile = useProfile();
  const selection = useSelectTheme();
  const selected = getTheme(profile.data?.selectedTheme ?? "rain-desk");
  const { t } = useTranslation();
  const changeOpen = (next: boolean) => {
    setOpen(next);
    setHovered(null);
    setFocusSlug(null);
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
        <div role="group" aria-label={t("scene.title")} className="grid grid-cols-2 gap-3">
          {themes.map((theme, index) => {
            const copy = themeCopy[theme.slug];
            const isSelected = selected.slug === theme.slug;
            return <button key={theme.slug} type="button" ref={(element) => { cards.current[index] = element; }}
              data-testid={`theme-card-${theme.slug}`} aria-pressed={isSelected}
              tabIndex={(focusSlug ?? selected.slug) === theme.slug ? 0 : -1}
              onFocus={() => setFocusSlug(theme.slug)}
              onPointerEnter={() => setHovered(theme.slug)} onPointerLeave={() => setHovered(null)}
              style={{ "--accent": theme.accentColor } as CSSProperties}
              className={cn("min-w-0 rounded-xl border bg-surface p-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent", isSelected ? "border-accent ring-2 ring-accent" : "border-border hover:border-accent/60")}
              onKeyDown={(event) => {
                const column = index % 2;
                const row = Math.floor(index / 2);
                const next = event.key === "ArrowRight" ? row * 2 + (column + 1) % 2
                  : event.key === "ArrowLeft" ? row * 2 + (column + 1) % 2
                  : event.key === "ArrowDown" || event.key === "ArrowUp" ? ((row + 1) % 2) * 2 + column : null;
                if (next !== null) { event.preventDefault(); event.stopPropagation(); cards.current[next]?.focus(); }
              }}
              onClick={() => { selection.mutate(theme.slug); changeOpen(false); }}>
              <div className="relative aspect-video overflow-hidden rounded-lg">
                <SceneVideo slug={theme.slug} posterOnly={!canHover || hovered !== theme.slug || !visible} />
              </div>
              <span className="mt-2 block px-1 text-small font-semibold">{t(copy.name)}</span>
              <span className="mt-1 mb-1 block truncate px-1 text-[11px] text-text-muted" title={t(copy.description)}>{t(copy.description)}</span>
            </button>;
          })}
        </div>
      </SheetContent>
    </Sheet>
    {selection.error && <p role="alert" className="fixed right-4 bottom-16 z-40 max-w-xs rounded-xl border border-border bg-surface p-3 text-small text-foreground">{t("scene.saveError")}</p>}
  </>;
}
