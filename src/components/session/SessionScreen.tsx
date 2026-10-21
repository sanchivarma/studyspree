"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Shuffle, MessageCircle } from "lucide-react";
import { ThemeScene } from "@/components/scene/ThemeScene";
import { SoloStudyScene } from "@/components/scene/SoloStudyScene";
import { defaultSoloScene } from "@/lib/soloScenes/catalog";
import { ThemeSheet } from "@/components/scene/ThemeSheet";
import { useProfile } from "@/hooks/useProfile";
import { useIdleVisibility } from "@/hooks/useIdleVisibility";
import { useTranslation } from "@/hooks/useTranslation";
import { getTheme } from "@/lib/themes/registry";
import { useSessionStore } from "@/stores/sessionStore";
import { now } from "@/lib/clock";
import { SessionFooter } from "./SessionFooter";
import { useEndSession } from "@/hooks/useEndSession";
import type { Session } from "@/types/domain";
import { cn } from "@/lib/utils";

import { useLocalCamera } from "@/hooks/useLocalCamera";
import { SelfView } from "@/components/webcam/SelfView";
import { AmbienceControl } from "@/components/ambience/AmbienceControl";
import { SessionCompanions } from "@/components/characters/SessionCompanions";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { SessionChat } from "./SessionChat";
import { SessionStatusControl } from "./SessionStatusControl";
import { SessionSelfCaption } from "./SessionSelfCaption";
import { PersonalTileSheet } from "./PersonalTileSheet";

export function SessionScreen({ session }: { session: Session }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [selfPinned, setSelfPinned] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatButton = useRef<HTMLButtonElement>(null);
  const profile = useProfile();
  const tile = usePersonalTile();
  const camera = useLocalCamera();
  const isFinishing = useSessionStore(state => state.isFinishing);
  const { mutate: endSession, error } = useEndSession();
  const finishing = useRef(false);
  const finishButton = useRef<HTMLButtonElement>(null);
  const finish = useCallback(() => {
    if (isFinishing || finishing.current) return;
    finishing.current = true;
    const completed = session.plannedMinutes !== null && now().getTime() - new Date(session.startedAt).getTime() >= session.plannedMinutes * 60_000;
    endSession({ id: session.id, reason: completed ? "completed" : "stopped_early" }, { onError: () => { finishing.current = false; } });
  }, [isFinishing, endSession, session.id, session.startedAt, session.plannedMinutes]);
  const slug = getTheme(profile.data?.selectedTheme ?? session.themeSlug).slug;
  const { t } = useTranslation();
  const { isVisible: idleVisible } = useIdleVisibility();
  const isVisible = sheetOpen || soundOpen || companionOpen || chatOpen || idleVisible;
  const isSelfInStage = selfPinned && camera.isReady && tile.data?.isVisible !== false;
  const style = { "--accent": getTheme(slug).accentColor } as CSSProperties;
  const fade = cn("transition-opacity duration-200 motion-reduce:transition-none", isVisible ? "opacity-100" : "pointer-events-none opacity-0");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (sheetOpen || soundOpen || companionOpen || chatOpen || event.key !== "Escape" || event.defaultPrevented || event.repeat) return;
      event.preventDefault();
      finish();
    };
    // Escape finishes when no drawer or popover is using it.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [finish, sheetOpen, soundOpen, companionOpen, chatOpen]);

  return <section aria-label={t("session.label")} data-testid="session-screen" data-controls-visible={isVisible} style={style}
    className={cn("relative isolate h-dvh w-full overflow-hidden", !isVisible && "cursor-none")}>
    {session.companions.mode === "solo" ? <SoloStudyScene preferences={profile.data?.soloScene ?? defaultSoloScene}/> : <ThemeScene slug={slug} priority />}
    <div aria-hidden="true" data-testid="session-side-backplate" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[60px] border-r border-border/40 bg-background/25 backdrop-blur-md"/>
    <div aria-hidden="true" data-testid="session-bottom-backplate" className={cn("pointer-events-none absolute right-0 bottom-0 left-[60px] z-10 h-[64px] border-t border-border/40 bg-background/25 backdrop-blur-md",fade)}/>
    <SessionCompanions session={session} visible={isVisible} onOpenChange={setCompanionOpen} leading={isSelfInStage ? <SelfView caption={<SessionSelfCaption admin onOpenChange={setSheetOpen}/>} camera={camera} visible={isVisible} mirrored={tile.data?.mirrored ?? true} status={tile.data?.status ?? ""} stage onTogglePin={() => setSelfPinned(false)}/> : undefined}
      sideControls={<><button ref={chatButton} type="button" aria-label={t("room.chat")} aria-expanded={chatOpen} aria-controls="room-chat" onClick={() => setChatOpen(true)} className="flex size-11 items-center justify-center rounded-xl bg-background/60 focus-visible:outline-2 focus-visible:outline-accent"><MessageCircle aria-hidden="true" className="size-4"/></button><SessionStatusControl onOpenChange={setSheetOpen}/><PersonalTileSheet onOpenChange={setSheetOpen}/></>}/>
    {chatOpen && <SessionChat onClose={() => setChatOpen(false)} onRestoreFocus={() => chatButton.current?.focus()}/>}
    <SessionFooter session={session} status={tile.data?.status} isVisible={isVisible} error={error} onFinish={finish} finishButton={finishButton}/>
    <div className="absolute bottom-0 left-0 z-30 h-36 w-[60px]">
      <AmbienceControl theme={slug} onOpenChange={setSoundOpen} className="!bottom-3 !left-2 border border-border/30 bg-background/45 backdrop-blur-sm"/>
      <ThemeSheet onOpenChange={setSheetOpen}>
        <button type="button" aria-label={t("study.switchTheme")} title={t("study.switchTheme")} className="absolute bottom-16 left-2 flex size-11 items-center justify-center rounded-xl border border-border/30 bg-background/45 text-foreground/60 backdrop-blur-sm hover:bg-background/60"><Shuffle aria-hidden="true" className="size-4"/></button>
      </ThemeSheet>
    </div>
    {!isSelfInStage && <SelfView caption={<SessionSelfCaption admin onOpenChange={setSheetOpen}/>} compactIdle camera={camera} visible={(camera.isReady ? isVisible : true) && (tile.data?.isVisible ?? true)} mirrored={tile.data?.mirrored ?? true} status={tile.data?.status ?? ""} bottomInset={session.companions.characterSlugs.length > 20 ? 108 : 64} onTogglePin={() => setSelfPinned(true)}/>}
  </section>;
}
