"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { CompanionPreferences } from "@/types/characters";
import { CharacterPicker } from "./CharacterPicker";
import { cn } from "@/lib/utils";
import { SoloScenePicker } from "@/components/scene/SoloScenePicker";

export function CompanionModePicker({ value, onChange, allowPeople = true, initialMode }: { value: CompanionPreferences; onChange: (value: CompanionPreferences) => void; allowPeople?: boolean; initialMode?: "solo" | "characters" | "people" }) {
  const { t } = useTranslation();
  const [chosenMode, setChosenMode] = useState<"solo" | "characters" | "people" | null>(initialMode ?? null);
  const selectedMode = chosenMode ?? value.mode;
  return <div className="space-y-4" data-testid="companion-mode-picker">
    <fieldset><legend className="mb-2 text-small font-semibold">{t("characters.title")}</legend>
      <div className={cn("grid gap-2", allowPeople ? "grid-cols-3" : "grid-cols-2")}>
        {(["solo", "characters", ...(allowPeople ? ["people" as const] : [])] as const).map(mode => <button key={mode} type="button"
          aria-pressed={selectedMode === mode}
          onClick={() => {
            setChosenMode(mode);
            onChange(mode === "people" ? { mode, characterSlugs: [] } : mode === "characters" && value.characterSlugs.length ? { mode, characterSlugs: value.characterSlugs } : { mode: "solo", characterSlugs: [] });
          }}
          className={cn("min-h-11 rounded-xl border px-2 text-small disabled:opacity-40", selectedMode === mode ? "border-accent bg-accent/10" : "border-border bg-surface")}>
          {t(`characters.${mode}`)}
        </button>)}
      </div>
    </fieldset>
    {selectedMode === "solo" && <SoloScenePicker/>}
    {selectedMode === "characters" && <CharacterPicker selected={value.characterSlugs} onChange={characterSlugs => onChange(characterSlugs.length ? { mode: "characters", characterSlugs } : { mode: "solo", characterSlugs: [] })} />}
  </div>;
}
