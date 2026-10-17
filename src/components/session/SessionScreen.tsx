"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Shuffle, MessageCircle } from "lucide-react";
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

import { SessionProgress } from "@/components/timer/SessionProgress";
import { useSessionTitle } from "@/hooks/useSessionTitle";
import { useLocalCamera } from "@/hooks/useLocalCamera";
import { SelfView } from "@/components/webcam/SelfView";
import { AmbienceControl } from "@/components/ambience/AmbienceControl";
import { SessionCompanions } from "@/components/characters/SessionCompanions";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { ShareSessionControl } from "@/components/community/ShareSessionControl";
import { SessionChat } from "./SessionChat";

export function SessionScreen({ session }: { session: Session }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [selfPinned, setSelfPinned] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatButton = useRef<HTMLButtonElement>(null);
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
  const isVisible = sheetOpen || soundOpen || companionOpen || shareOpen || chatOpen || idleVisible;
  const isSelfInStage = selfPinned && camera.isReady && tile.data?.isVisible !== false;
  const style = { "--accent": getTheme(slug).accentColor } as CSSProperties;
  const fade = cn("transition-opacity duration-200 motion-reduce:transition-none", isVisible ? "opacity-100" : "pointer-events-none opacity-0");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && !idleVisibleRef.current && !sheetOpen && !soundOpen && !companionOpen && !shareOpen && !chatOpen && !event.defaultPrevented) {
        event.preventDefault();
        finishButton.current?.focus();
        return;
      }
      if (sheetOpen || soundOpen || companionOpen || shareOpen || chatOpen || event.key !== "Escape" || event.defaultPrevented || event.repeat) return;
      event.preventDefault();
      finish();
    };
    // Capture the revealing Tab before idle restoration changes the tab order.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [finish, sheetOpen, soundOpen, companionOpen, shareOpen, chatOpen, idleVisibleRef]);

  return <section aria-label={t("session.label")} data-testid="session-screen" data-controls-visible={isVisible} style={style}
    className={cn("relative isolate h-dvh w-full overflow-hidden", !isVisible && "cursor-none")}>
    <ThemeScene slug={slug} priority />
    <SessionCompanions session={session} visible={isVisible} onOpenChange={setCompanionOpen} leading={isSelfInStage ? <SelfView camera={camera} visible={isVisible} mirrored={tile.data?.mirrored ?? true} stage onTogglePin={() => setSelfPinned(false)}/> : undefined}
      sideControls={<button ref={chatButton} type="button" aria-label={t("room.chat")} aria-expanded={chatOpen} aria-controls="room-chat" onClick={() => setChatOpen(true)} className="flex size-11 items-center justify-center rounded-xl bg-background/60 focus-visible:outline-2 focus-visible:outline-accent"><MessageCircle aria-hidden="true" className="size-4"/></button>}/>
    <div className={cn("absolute top-2 left-2 z-30", fade)}><ShareSessionControl compact sessionId={session.id} onOpenChange={setShareOpen}/></div>
    {chatOpen && <SessionChat sessionId={session.id} onClose={() => setChatOpen(false)} onRestoreFocus={() => chatButton.current?.focus()}/>}
    <div data-testid="session-controls" className="absolute right-3 bottom-2 left-[60px] flex h-[68px] items-center gap-3">
      <div className="min-w-0 flex-1">
        <div data-testid="session-details" className={fade}>
          <p data-testid="session-elapsed" className="text-[13px] text-foreground/70 tabular-nums">{t("session.elapsed", { time: formatTimer(elapsedSeconds) })}</p>
          {remainingSeconds !== null && <p data-testid="session-time" className="text-[11px] text-foreground/50 tabular-nums">{t("session.remaining", { time })}</p>}
          {remainingSeconds === null && <span data-testid="session-time" className="sr-only">{t("session.elapsed", { time })}</span>}
          {task && <p className="truncate text-[11px] text-foreground/40">{task}</p>}
        </div>
        <div className={cn("mt-1 transition-opacity duration-200 motion-reduce:transition-none", !isVisible && "opacity-40")}><SessionProgress elapsedSeconds={elapsedSeconds} plannedMinutes={session.plannedMinutes}/></div>
        {error && <p role="alert" className="text-small text-text-muted">{t("session.finishError")}</p>}
      </div>
      <button ref={finishButton} type="button" aria-keyshortcuts="Escape" onClick={finish} disabled={isFinishing}
        className={cn("min-h-11 shrink-0 rounded-xl border border-border px-4 text-body text-foreground/80 hover:bg-background/30 disabled:opacity-60", fade)}>{t("session.finish")}</button>
    </div>
    <div className={cn("absolute bottom-0 left-0 h-36 w-[60px]", fade)}>
      <AmbienceControl theme={slug} onOpenChange={setSoundOpen} className="!bottom-3 !left-2"/>
      <ThemeSheet onOpenChange={setSheetOpen}>
        <button type="button" aria-label={t("study.switchTheme")} title={t("study.switchTheme")} className="absolute bottom-16 left-2 flex size-11 items-center justify-center rounded-xl text-foreground/60 hover:bg-background/30"><Shuffle aria-hidden="true" className="size-4"/></button>
      </ThemeSheet>
    </div>
    {!isSelfInStage && <SelfView compactIdle camera={camera} visible={isVisible && (tile.data?.isVisible ?? true)} mirrored={tile.data?.mirrored ?? true} status={tile.data?.status ?? ""} bottomInset={session.companions.characterSlugs.length > 20 ? 128 : 84} onTogglePin={() => setSelfPinned(true)}/>}
  </section>;
}
