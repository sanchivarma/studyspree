"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { CompanionPreferences } from "@/types/characters";
import { CharacterPicker } from "./CharacterPicker";
import { cn } from "@/lib/utils";
import { useAccountMode } from "@/hooks/useAccountMode";
import { useRouter } from "next/navigation";
import { SoloScenePicker } from "@/components/scene/SoloScenePicker";

export function CompanionModePicker({ value, onChange, allowPeople = true }: { value: CompanionPreferences; onChange: (value: CompanionPreferences) => void; allowPeople?: boolean }) {
  const { t } = useTranslation();
  const accountMode = useAccountMode();const router=useRouter();
  return <div className="space-y-4" data-testid="companion-mode-picker">
    <fieldset><legend className="mb-2 text-small font-semibold">{t("characters.title")}</legend>
      <div className={cn("grid gap-2", allowPeople ? "grid-cols-3" : "grid-cols-2")}>
        {(["solo", "characters", ...(allowPeople ? ["people" as const] : [])] as const).map(mode => <button key={mode} type="button"
          aria-pressed={value.mode === mode}
          onClick={() => mode==="people"?router.push(accountMode === "preview" ? "/invite" : "/spaces"):onChange(mode === "characters" ? { mode, characterSlugs: value.characterSlugs.length ? value.characterSlugs : ["male-01"] } : { mode, characterSlugs: [] })}
          className={cn("min-h-11 rounded-xl border px-2 text-small disabled:opacity-40", value.mode === mode ? "border-accent bg-accent/10" : "border-border bg-surface")}>
          {t(`characters.${mode}`)}
        </button>)}
      </div>
    </fieldset>
    {value.mode === "solo" && <SoloScenePicker/>}
    {value.mode === "characters" && <CharacterPicker selected={value.characterSlugs} onChange={characterSlugs => onChange(characterSlugs.length ? { mode: "characters", characterSlugs } : { mode: "solo", characterSlugs: [] })} />}
  </div>;
}
