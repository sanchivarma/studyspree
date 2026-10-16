"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Shuffle } from "lucide-react";
import { ThemeScene } from "@/components/scene/ThemeScene";
import { ThemeSheet } from "@/components/scene/ThemeSheet";
import { useProfile } from "@/hooks/useProfile";
import { useIdleVisibility } from "@/hooks/useIdleVisibility";
import { useTranslation } from "@/hooks/useTranslation";
import { getTheme } from "@/lib/themes/registry";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useEndSession } from "@/hooks/useEndSession";
import { formatTimer } from "@/lib/session/presentation";
import type { Session } from "@/types/domain";
import { cn } from "@/lib/utils";

import { DepletingRing } from "@/components/timer/DepletingRing";
import { useSessionTitle } from "@/hooks/useSessionTitle";
import { useLocalCamera } from "@/hooks/useLocalCamera";
import { SelfView } from "@/components/webcam/SelfView";
import { AmbienceControl } from "@/components/ambience/AmbienceControl";
import { SessionCompanions } from "@/components/characters/SessionCompanions";
import { usePersonalTile } from "@/hooks/usePersonalTile";

export function SessionScreen({ session }: { session: Session }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const profile = useProfile();
  const tile = usePersonalTile();
  const camera = useLocalCamera();
  const { elapsedSeconds, remainingSeconds, isFinishing } = useSessionTimer(session);
  const { mutate: endSession, error } = useEndSession();
  const finishing = useRef(false);
  const finishButton = useRef<HTMLButtonElement>(null);
  const finish = useCallback(() => {
    if (isFinishing || finishing.current) return;
    finishing.current = true;
    endSession({ id: session.id, reason: remainingSeconds !== null && remainingSeconds <= 0 ? "completed" : "stopped_early" }, { onError: () => { finishing.current = false; } });
  }, [isFinishing, endSession, session.id, remainingSeconds]);
  const slug = getTheme(profile.data?.selectedTheme ?? session.themeSlug).slug;
  const task = session.task;
  const time = formatTimer(remainingSeconds ?? elapsedSeconds);
  useSessionTitle(time);
  const { t } = useTranslation();
  const { isVisible: idleVisible, visibleRef: idleVisibleRef } = useIdleVisibility();
  const isVisible = sheetOpen || soundOpen || companionOpen || idleVisible;
  const style = { "--accent": getTheme(slug).accentColor } as CSSProperties;
  const fade = cn("transition-opacity duration-200 motion-reduce:transition-none", isVisible ? "opacity-100" : "pointer-events-none opacity-0");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && !idleVisibleRef.current && !sheetOpen && !soundOpen && !companionOpen && !event.defaultPrevented) {
        event.preventDefault();
        finishButton.current?.focus();
        return;
      }
      if (sheetOpen || soundOpen || companionOpen || event.key !== "Escape" || event.defaultPrevented || event.repeat) return;
      event.preventDefault();
      finish();
    };
    // Capture the revealing Tab before idle restoration changes the tab order.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [finish, sheetOpen, soundOpen, companionOpen, idleVisibleRef]);

  return <section aria-label={t("session.label")} data-testid="session-screen" data-controls-visible={isVisible} style={style}
    className={cn("relative isolate h-dvh w-full overflow-hidden", !isVisible && "cursor-none")}>
    <ThemeScene slug={slug} priority />
    <SessionCompanions session={session} visible={isVisible} onOpenChange={setCompanionOpen} />

    <div className="absolute top-10 right-6 left-6 flex flex-col items-center md:top-12">
      <div className={cn("shrink-0 transition-opacity duration-200 motion-reduce:transition-none", isVisible ? "opacity-100" : "opacity-40")}>
        <DepletingRing elapsedSeconds={elapsedSeconds} totalSeconds={session.plannedMinutes === null ? null : session.plannedMinutes * 60} size={120} strokeWidth={6} accent="var(--accent)" />
      </div>
      <div data-testid="session-details" className={cn("mt-4 w-full text-center", fade)}>
        <p data-testid="session-time" className="text-[18px] opacity-60 tabular-nums">{t(remainingSeconds === null ? "session.elapsed" : "session.remaining", { time })}</p>
        {task && <p className="mx-auto mt-2 max-w-[480px] truncate text-[13px] opacity-40">{task}</p>}
        {error && <p role="alert" className="mt-3 text-small text-text-muted">{t("session.finishError")}</p>}
      </div>
    </div>

    <div data-testid="session-controls" className={cn("absolute right-0 bottom-0 left-0 h-[194px] sm:h-[138px]", fade)}>
      <button ref={finishButton} type="button" aria-keyshortcuts="Escape" onClick={finish} disabled={isFinishing}
        className="absolute bottom-6 left-1/2 min-h-11 -translate-x-1/2 rounded-xl border border-border px-4 text-body text-foreground/80 hover:bg-background/30 disabled:opacity-60 sm:px-6">
        {t("session.finish")}
      </button>
      <AmbienceControl theme={slug} onOpenChange={setSoundOpen} />
      <ThemeSheet onOpenChange={setSheetOpen}>
        <button type="button" aria-label={t("study.switchTheme")} title={t("study.switchTheme")}
          className="absolute bottom-20 left-4 flex size-11 items-center justify-center rounded-xl text-foreground/60 hover:bg-background/30 sm:left-6">
          <Shuffle aria-hidden="true" className="size-4" />
        </button>
      </ThemeSheet>
    </div>
    <SelfView camera={camera} visible={isVisible && (tile.data?.isVisible ?? true)} mirrored={tile.data?.mirrored ?? true} status={tile.data?.status ?? ""} />
  </section>;
}
