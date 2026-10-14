"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { CharacterScene } from "@/components/scene/CharacterScene";
import { CharacterSheet } from "@/components/scene/CharacterSheet";
import { getCharacter } from "@/lib/characters/registry";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentHour } from "@/hooks/useCurrentHour";
import { AccountControls } from "@/components/layout/AccountControls";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useProfile } from "@/hooks/useProfile";
import { useRecentSession } from "@/hooks/useRecentSession";
import { useStartSession } from "@/hooks/useStartSession";
import { now } from "@/lib/clock";
import { useComeback } from "@/hooks/useComeback";
import { ComebackScreen } from "@/components/start/ComebackScreen";

const durations = [5, 15, 25, 50, "open"] as const;

export function StartScreen({ displayName, initialHour }: { displayName: string; initialHour: number }) {
  const router = useRouter();
  const { t } = useTranslation();
  const active = useActiveSession();
  const profile = useProfile();
  const recent = useRecentSession();
  const comeback = useComeback(!active.isPending && !active.data);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chosenDuration, setChosenDuration] = useState<number | null | undefined>(undefined);
  const latest = recent.data?.[0];
  const selectedDuration = chosenDuration !== undefined ? chosenDuration : latest?.endedAt ? latest.plannedMinutes : 5;
  const slug = getCharacter(profile.data?.selectedCharacter ?? "rain-desk").slug;
  const mountedAt = useRef<number | null>(null);
  const { mutate, isPending, error } = useStartSession(() => {
    console.debug("time_to_start_ms", Math.max(0, now().getTime() - (mountedAt.current ?? now().getTime())));
  });
  const starting = useRef(false);
  const taskRef = useRef<HTMLInputElement>(null);
  const startSession = useCallback(() => {
    if (starting.current || isPending) return;
    starting.current = true;
    const task = taskRef.current?.value.trim();
    mutate({ plannedMinutes: selectedDuration, characterSlug: slug, task: task || null }, {
      onSettled: () => { starting.current = false; },
    });
  }, [mutate, isPending, selectedDuration, slug]);
  const hour = useCurrentHour(initialHour);
  const greeting = t(hour < 12 ? "home.morning" : hour < 18 ? "home.afternoon" : "home.evening", { username: profile.data?.displayName || displayName });
  const style = { "--accent": getCharacter(slug).accentColor } as CSSProperties;

  useEffect(() => {
    mountedAt.current ??= now().getTime();
  }, []);
  useEffect(() => {
    if (active.data && !starting.current) router.replace(`/session/${active.data.id}`);
  }, [active.data, router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        comeback.offer || sheetOpen || event.defaultPrevented || event.repeat || event.isComposing ||
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
  }, [startSession, sheetOpen, comeback.offer]);

  if (comeback.offer) return <ComebackScreen name={profile.data?.displayName || displayName} slug={slug}
    totalSeconds={comeback.offer.totalSeconds} daysAway={comeback.offer.daysAway} onDismiss={comeback.dismiss} />;

  return (
    <section
      aria-label={t("study.sessionLabel")}
      className="relative isolate flex min-h-[calc(100dvh-3.5rem)] flex-col justify-end md:min-h-dvh"
      style={style}
    >
      <CharacterScene slug={slug} priority />
      <div aria-hidden="true" className="start-screen-scrim pointer-events-none absolute inset-0" />
      <AccountControls />

      <div className="relative mx-auto w-full max-w-[480px] px-6 pt-24 pb-20 md:pb-6">
        <p className="mb-6 text-small text-text-muted">{greeting}</p>

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

      <CharacterSheet onOpenChange={setSheetOpen}><button
        type="button"
        aria-label={t("study.switchCharacter")}
        title={t("study.switchCharacter")}
        className="absolute right-4 bottom-4 flex size-11 items-center justify-center rounded-xl text-text-muted hover:bg-background/30"
      >
        <Shuffle aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button></CharacterSheet>
    </section>
  );
}
