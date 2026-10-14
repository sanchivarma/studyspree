"use client";

import { Shuffle } from "lucide-react";
import { AccountControls } from "@/components/layout/AccountControls";
import { CharacterSheet, characterCopy } from "@/components/scene/CharacterSheet";
import { SceneVideo } from "@/components/scene/SceneVideo";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter } from "@/lib/characters/registry";

export function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  const character = getCharacter(profile.data?.selectedCharacter ?? "rain-desk");
  return <section className="mx-auto w-full max-w-2xl px-6 pt-24 pb-8">
    <AccountControls />
    <h1 className="mb-6 text-title">{t("common.settings")}</h1>
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-body font-semibold">{t("settings.appearance")}</h2>
      <CharacterSheet>
        <button type="button" className="mt-4 flex min-h-16 w-full items-center gap-4 rounded-xl border border-border p-3 text-left hover:bg-surface-2">
          <span className="relative block aspect-video w-20 shrink-0 overflow-hidden rounded-lg"><SceneVideo slug={character.slug} posterOnly /></span>
          <span className="flex-1"><span className="block text-small text-text-muted">{t("settings.character")}</span><span className="block text-body">{t(characterCopy[character.slug].name)}</span></span>
          <Shuffle aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
        </button>
      </CharacterSheet>
    </section>
  </section>;
}
