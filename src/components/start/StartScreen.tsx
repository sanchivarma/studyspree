"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { ScenePlaceholder } from "@/components/scene/ScenePlaceholder";
import { getCharacter } from "@/lib/characters/registry";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentHour } from "@/hooks/useCurrentHour";
import { AccountControls } from "@/components/layout/AccountControls";
import type { CharacterSlug } from "@/lib/characters/registry";

const durations = [5, 15, 25, 50, "open"] as const;

export function StartScreen({ displayName, initialHour, slug }: { displayName: string; initialHour: number; slug: CharacterSlug }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedDuration, setSelectedDuration] = useState<(typeof durations)[number]>(5);
  const hour = useCurrentHour(initialHour);
  const greeting = t(hour < 12 ? "home.morning" : hour < 18 ? "home.afternoon" : "home.evening", { username: displayName });
  const style = { "--accent": getCharacter(slug).accentColor } as CSSProperties;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented || event.repeat || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey ||
        (event.key !== " " && event.key !== "Enter")
      ) return;

      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, button, a, [role='button'], [contenteditable]:not([contenteditable='false'])")) return;

      event.preventDefault();
      router.push("/session/demo");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <section
      aria-label={t("study.sessionLabel")}
      className="relative isolate flex min-h-[calc(100dvh-3.5rem)] flex-col justify-end md:min-h-dvh"
      style={style}
    >
      <ScenePlaceholder slug={slug} />
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
                aria-pressed={selectedDuration === duration}
                onClick={() => setSelectedDuration(duration)}
                className={cn(
                  "flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-0.5 text-small whitespace-nowrap tabular-nums",
                  selectedDuration === duration
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
          aria-label={t("study.task")}
          placeholder={t("study.task")}
          type="text"
          className="mb-5 h-12 w-full rounded-xl border border-border bg-background/30 px-4 text-small text-foreground placeholder:text-text-muted"
        />

        <button
          type="button"
          aria-keyshortcuts="Enter Space"
          onClick={() => router.push("/session/demo")}
          className="h-14 w-full rounded-2xl bg-accent text-[18px] font-semibold text-background"
        >
          {t("common.start")}
        </button>
      </div>

      <button
        type="button"
        aria-label={t("study.switchCharacter")}
        aria-disabled="true"
        title={t("study.switchCharacter")}
        className="absolute right-4 bottom-4 flex size-11 items-center justify-center rounded-xl text-text-muted/60"
      >
        <Shuffle aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>
    </section>
  );
}
