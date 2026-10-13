"use client";

import { useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Volume2 } from "lucide-react";
import { ScenePlaceholder } from "@/components/scene/ScenePlaceholder";
import { useIdleVisibility } from "@/hooks/useIdleVisibility";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter, type CharacterSlug } from "@/lib/characters/registry";
import { cn } from "@/lib/utils";

const RADIUS = 57;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PROGRESS = 62;
const COMPLETE_PATH = "/session/demo/complete";

export function SessionScreen({ slug, task }: { slug: CharacterSlug; task?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const isVisible = useIdleVisibility();
  const style = { "--accent": getCharacter(slug).accentColor } as CSSProperties;
  const fade = cn("transition-opacity duration-200 motion-reduce:transition-none", isVisible ? "opacity-100" : "pointer-events-none opacity-0");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.repeat) return;
      event.preventDefault();
      router.push(COMPLETE_PATH);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return <section aria-label={t("session.label")} data-testid="session-screen" data-controls-visible={isVisible} style={style}
    className={cn("relative isolate h-dvh w-full overflow-hidden", !isVisible && "cursor-none")}>
    <ScenePlaceholder slug={slug} />

    <div className="absolute top-10 right-6 left-6 flex flex-col items-center md:top-12">
      <svg role="progressbar" aria-label={t("session.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={PROGRESS}
        width={120} height={120} viewBox="0 0 120 120" className={cn("shrink-0 transition-opacity duration-200 motion-reduce:transition-none", isVisible ? "opacity-100" : "opacity-40")}>
        <circle cx={60} cy={60} r={RADIUS} fill="none" strokeWidth={6} className="stroke-white/10" />
        <circle cx={60} cy={60} r={RADIUS} fill="none" strokeWidth={6} strokeLinecap="round" className="stroke-accent"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - PROGRESS / 100)} transform="rotate(-90 60 60)" />
      </svg>
      <div data-testid="session-details" className={cn("mt-4 w-full text-center", fade)}>
        <p className="text-[18px] opacity-60 tabular-nums">{t("session.remaining", { time: "15:23" })}</p>
        {task && <p className="mx-auto mt-2 max-w-[480px] truncate text-[13px] opacity-40">{task}</p>}
      </div>
    </div>

    <div data-testid="session-controls" className={cn("absolute right-0 bottom-0 left-0 h-[194px] sm:h-[138px]", fade)}>
      <button type="button" aria-keyshortcuts="Escape" onClick={() => router.push(COMPLETE_PATH)}
        className="absolute bottom-6 left-1/2 min-h-11 -translate-x-1/2 rounded-xl border border-border px-4 text-body text-foreground/80 hover:bg-background/30 sm:px-6">
        {t("session.finish")}
      </button>
      <div className="absolute right-4 bottom-20 flex h-[90px] w-[120px] items-center justify-center rounded-xl border border-border bg-surface/30 sm:right-6 sm:bottom-6">
        <span className="text-small opacity-40">{t("session.camera")}</span>
      </div>
      <button type="button" aria-label={t("session.sound")} aria-disabled="true" title={t("session.sound")}
        className="absolute bottom-6 left-4 flex size-11 items-center justify-center rounded-xl text-foreground/60 sm:left-6">
        <Volume2 aria-hidden="true" className="size-5" />
      </button>
    </div>
  </section>;
}
