"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {useAccountMode} from "@/hooks/useAccountMode";
import { useRouter } from "next/navigation";
import { Shuffle, Users, X } from "lucide-react";
import { CompanionModePicker } from "@/components/characters/CompanionModePicker";
import { useCompanionPreferences } from "@/hooks/useCompanionPreferences";
import type { CompanionPreferences } from "@/types/characters";
import { soloCompanions } from "@/lib/characters/schemas";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { ThemeScene } from "@/components/scene/ThemeScene";
import { SoloStudyScene } from "@/components/scene/SoloStudyScene";
import { defaultSoloScene } from "@/lib/soloScenes/catalog";
import { ThemeSheet } from "@/components/scene/ThemeSheet";
import { getTheme } from "@/lib/themes/registry";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentHour } from "@/hooks/useCurrentHour";
import { AccountControls } from "@/components/layout/AccountControls";
import { useDashboard } from "@/hooks/useDashboard";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useProfile } from "@/hooks/useProfile";
import { useRecentSession } from "@/hooks/useRecentSession";
import { useStartSession } from "@/hooks/useStartSession";
import { now } from "@/lib/clock";
import { useComeback } from "@/hooks/useComeback";
import { ComebackScreen } from "@/components/start/ComebackScreen";

const durations = [5, 15, 25, 50, "open"] as const;

export function StartScreen({ displayName, initialHour, initialMode }: { displayName: string; initialHour: number; initialMode?: "solo" | "characters" }) {
  const router = useRouter();
  const { t } = useTranslation();
  const accountMode=useAccountMode();
  const [visibility,setVisibility]=useState<"public"|"private">("private");
  const titleRef=useRef<HTMLInputElement>(null);
  const rulesRef=useRef<HTMLTextAreaElement>(null);
  const [titleError,setTitleError]=useState(false);
  const active = useActiveSession();
  const roomSession=Boolean(active.data&&(["people","mixed"].includes(active.data.companions.mode)||active.data.visibility==="public"));
  const dashboard=useDashboard(roomSession);
  const profile = useProfile();
  const recent = useRecentSession();
  const comeback = useComeback(!active.isPending && !active.data);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const companionPreferences = useCompanionPreferences();
  const [chosenCompanions, setChosenCompanions] = useState<CompanionPreferences | null>(null);
  const companions = useMemo<CompanionPreferences>(() => chosenCompanions ?? (initialMode === "solo" ? soloCompanions()
    : initialMode === "characters" && companionPreferences.value.characterSlugs.length ? { mode: "characters", characterSlugs: companionPreferences.value.characterSlugs }
    : companionPreferences.value), [chosenCompanions, initialMode, companionPreferences.value]);
  const [chosenDuration, setChosenDuration] = useState<number | null | undefined>(undefined);
  const latest = recent.data?.[0];
  const selectedDuration = chosenDuration !== undefined ? chosenDuration : latest?.endedAt ? latest.plannedMinutes : 5;
  const slug = getTheme(profile.data?.selectedTheme ?? "rain-desk").slug;
  const mountedAt = useRef<number | null>(null);
  const { mutate, isPending, error } = useStartSession(() => {
    console.debug("time_to_start_ms", Math.max(0, now().getTime() - (mountedAt.current ?? now().getTime())));
  });
  const starting = useRef(false);
  const taskRef = useRef<HTMLInputElement>(null);
  const startSession = useCallback(() => {
    if (starting.current || isPending) return;
    const title=titleRef.current?.value.trim();
    if(!title){setTitleError(true);titleRef.current?.focus();return;}
    setTitleError(false);starting.current = true;
    const task = taskRef.current?.value.trim();
    mutate({ plannedMinutes: selectedDuration, themeSlug: slug, task: task || null, companions,title,rules:rulesRef.current?.value.trim()||null,visibility }, {
      onSettled: () => { starting.current = false; },
    });
  }, [mutate, isPending, selectedDuration, slug, companions,visibility]);
  const hour = useCurrentHour(initialHour);
  const greeting = t(hour < 12 ? "home.morning" : hour < 18 ? "home.afternoon" : "home.evening", { username: profile.data?.displayName || displayName });
  const style = { "--accent": getTheme(slug).accentColor } as CSSProperties;

  useEffect(() => {
    mountedAt.current ??= now().getTime();
  }, []);
  useEffect(() => {
    if (active.data && !starting.current) {
      if(roomSession&&dashboard.isPending)return;
      router.replace(dashboard.data?.activeRoomId?`/rooms/${dashboard.data.activeRoomId}`:`/session/${active.data.id}`);
    }
  }, [active.data, dashboard.data, dashboard.isPending, roomSession, router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        comeback.offer || sheetOpen || companionOpen || event.defaultPrevented || event.repeat || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey ||
        (event.key !== " " && event.key !== "Enter")
      ) return;

      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, button, a, [role='button'], [contenteditable]:not([contenteditable='false'])")) return;

      event.preventDefault();
      startSession();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startSession, sheetOpen, companionOpen, comeback.offer]);

  if (comeback.offer) return <ComebackScreen name={profile.data?.displayName || displayName} slug={slug}
    totalSeconds={comeback.offer.totalSeconds} daysAway={comeback.offer.daysAway} onDismiss={comeback.dismiss} />;

  return (
    <section
      aria-label={t("study.sessionLabel")}
      className="relative isolate flex min-h-[calc(100dvh-3.5rem)] flex-col justify-end md:min-h-dvh"
      style={style}
    >
      {companions.mode === "solo" ? <SoloStudyScene preferences={profile.data?.soloScene ?? defaultSoloScene}/> : <ThemeScene slug={slug} priority />}
      <div aria-hidden="true" className="start-screen-scrim pointer-events-none absolute inset-0" />
      <AccountControls />

      <div className="relative z-30 mx-auto w-full max-w-[480px] px-6 pt-24 pb-20 md:pb-6">
        <p className="mb-6 text-small text-text-muted">{greeting}</p>
        <Sheet open={companionOpen} onOpenChange={setCompanionOpen}>
          <SheetTrigger asChild><button type="button" aria-label={t("characters.change")} className="mb-4 flex min-h-11 w-full items-center gap-3 rounded-xl border border-border bg-background/40 px-4 text-small">
            <Users aria-hidden="true" className="size-4" />{t(companions.mode === "characters" || (!chosenCompanions && initialMode === "characters") ? "characters.characters" : "characters.solo")}
            {companions.characterSlugs.length > 0 && <span className="ml-auto text-text-muted">{t("characters.selected", { count: companions.characterSlugs.length })}</span>}
          </button></SheetTrigger>
          <SheetContent side="right" showCloseButton={false} className="w-full overflow-y-auto bg-background p-5 sm:max-w-[440px]">
            <SheetHeader className="mb-5 p-0 pr-11"><SheetTitle>{t("characters.title")}</SheetTitle><SheetDescription>{t("characters.description")}</SheetDescription></SheetHeader>
            <SheetClose asChild><button type="button" aria-label={t("scene.close")} className="absolute top-2 right-2 flex size-11 items-center justify-center"><X className="size-5" /></button></SheetClose>
            <CompanionModePicker initialMode={!chosenCompanions ? initialMode : undefined} value={companions} onChange={value => { setChosenCompanions(value); companionPreferences.mutation.mutate(value); }} />
            {companionPreferences.mutation.error && <p role="alert" className="mt-4 text-small">{t("characters.saveError")}</p>}
          </SheetContent>
        </Sheet>

        <label className="mb-3 block text-small">{t("sessionSetup.title")}<input ref={titleRef} aria-label={t("sessionSetup.title")} defaultValue={t("sessionSetup.defaultTitle")} required maxLength={100} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background/40 px-3"/></label>
        <label className="mb-3 block text-small">{t("sessionSetup.rules")}<textarea ref={rulesRef} rows={2} maxLength={2000} className="mt-1 w-full rounded-xl border border-border bg-background/40 px-3 py-2"/></label>
        <fieldset className="mb-4"><legend className="text-small">{t("sessionSetup.visibility")}</legend><div className="flex flex-wrap gap-4">{(["private","public"]as const).map(value=><label key={value} className="flex min-h-11 items-center gap-2"><input type="radio" name="sessionVisibility" value={value} checked={visibility===value} disabled={value==="public"&&accountMode==="preview"} onChange={()=>setVisibility(value)}/>{t(`sessionSetup.${value}`)}</label>)}</div>{accountMode==="preview"&&<p className="text-small text-text-muted">{t("sessionSetup.previewPublic")}</p>}</fieldset>
        {titleError&&<p role="alert">{t("sessionSetup.needTitle")}</p>}
        <fieldset className="mb-4">
          <legend className="sr-only">{t("study.duration")}</legend>
          <div className="grid grid-cols-[2fr_repeat(4,minmax(0,1fr))] gap-1.5">
            {durations.map((duration) => (
              <button
                key={duration}
                type="button"
                aria-pressed={selectedDuration === (duration === "open" ? null : duration)}
                onClick={() => setChosenDuration(duration === "open" ? null : duration)}
                className={cn(
                  "flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-0.5 text-small whitespace-nowrap tabular-nums",
                  selectedDuration === (duration === "open" ? null : duration)
                    ? "border-accent bg-accent text-background"
                    : "border-border bg-background/20 text-text-muted hover:border-accent/40 hover:text-foreground",
                )}
              >
                <span className="text-center whitespace-normal">{duration === "open" ? t("study.open") : t("study.minutes", { count: duration })}</span>
                {duration === 5 && <span className="px-1 text-center text-[11px] leading-4 whitespace-normal">{t("study.openHint")}</span>}
              </button>
            ))}
          </div>
        </fieldset>

        <input
          ref={taskRef}
          maxLength={200}
          aria-label={t("study.task")}
          placeholder={t("study.task")}
          type="text"
          className="mb-5 h-12 w-full rounded-xl border border-border bg-background/30 px-4 text-small text-foreground placeholder:text-text-muted"
        />

        <button
          type="button"
          aria-keyshortcuts="Enter Space"
          onClick={startSession}
          disabled={isPending}
          className="h-14 w-full rounded-2xl bg-accent text-[18px] font-semibold text-background disabled:opacity-60"
        >
          {t("common.start")}
        </button>
        {error && <p role="alert" className="mt-3 text-small text-text-muted">{t("study.startError")}</p>}
      </div>

      <ThemeSheet onOpenChange={setSheetOpen}><button
        type="button"
        aria-label={t("study.switchTheme")}
        title={t("study.switchTheme")}
        className="absolute right-4 bottom-4 flex size-11 items-center justify-center rounded-xl text-text-muted hover:bg-background/30"
      >
        <Shuffle aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button></ThemeSheet>
    </section>
  );
}
