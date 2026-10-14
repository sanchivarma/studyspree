"use client";

import { Shuffle } from "lucide-react";
import { AccountControls } from "@/components/layout/AccountControls";
import { CharacterSheet, characterCopy } from "@/components/scene/CharacterSheet";
import { SceneVideo } from "@/components/scene/SceneVideo";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter } from "@/lib/characters/registry";
import { useSetWebcamEnabled } from "@/hooks/useSetWebcamEnabled";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  const webcam = useSetWebcamEnabled();
  const reducedMotion = useReducedMotion();
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
    <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-body font-semibold">{t("settings.camera")}</h2>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p id="webcam-enabled-label" className="text-body">{t("settings.selfView")}</p>
          <p className="mt-1 text-small text-text-muted">{t("settings.cameraPrivacy")}</p>
        </div>
        <button type="button" role="switch" aria-labelledby="webcam-enabled-label" aria-checked={profile.data?.webcamEnabled ?? false}
          disabled={profile.isPending || webcam.isPending} onClick={() => webcam.mutate(!profile.data?.webcamEnabled)}
          className="flex h-11 w-14 shrink-0 items-center rounded-full border border-border bg-background px-2 disabled:opacity-60">
          <span aria-hidden="true" style={{ transitionDuration: reducedMotion ? "0ms" : undefined }} className={`size-5 rounded-full transition-transform duration-200 motion-reduce:transition-none ${profile.data?.webcamEnabled ? "translate-x-4 bg-accent" : "bg-text-muted"}`} />
        </button>
      </div>
      {webcam.error && <p role="alert" className="mt-3 text-small text-text-muted">{t("settings.cameraSaveError")}</p>}
    </section>
  </section>;
}
