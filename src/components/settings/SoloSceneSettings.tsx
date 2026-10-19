"use client";

import { useProfile } from "@/hooks/useProfile";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useTranslation } from "@/hooks/useTranslation";
import { defaultSoloScene, deskSlugs, windowSlugs, soloSceneSchema } from "@/lib/soloScenes/catalog";
import { SoloStudyScene } from "@/components/scene/SoloStudyScene";

export function SoloSceneSettings() {
  const profile=useProfile(), active=useActiveSession(), update=useUpdateProfile();
  const {t}=useTranslation();
  const preferences=profile.data?.soloScene ?? defaultSoloScene;
  const mode=active.data?.companions.mode ?? profile.data?.companionPreferences.mode;
  const enabled=mode === "solo", disabled=!enabled || !profile.data;
  const selectClass="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 disabled:opacity-50";
  return <section className="mt-4 rounded-2xl border border-border bg-surface p-5" data-testid="solo-scene-settings">
    <h2 className="text-body font-semibold">{t("soloScene.title")}</h2>
    {!enabled && <p className="mt-2 text-small text-text-muted">{t("soloScene.soloRequired")}</p>}
    <label className="mt-4 block text-small">{t("soloScene.desk")}
      <select className={selectClass} disabled={disabled} value={preferences.desk} onChange={event=>update.mutate({soloScene:soloSceneSchema.parse({...preferences,desk:event.target.value})})}>
        <option value="none">{t("soloScene.desk-none")}</option>
        {deskSlugs.map(slug=><option key={slug} value={slug}>{t(`soloScene.desk-${slug}`)}</option>)}
      </select>
    </label>
    <label className="mt-4 block text-small">{t("soloScene.window")}
      <select className={selectClass} disabled={disabled} value={preferences.window} onChange={event=>update.mutate({soloScene:soloSceneSchema.parse({...preferences,window:event.target.value})})}>
        {windowSlugs.map(slug=><option key={slug} value={slug}>{t(`soloScene.window-${slug}`)}</option>)}
      </select>
    </label>
    {enabled && <div aria-label={t("soloScene.preview")} className="relative mt-4 aspect-video overflow-hidden rounded-xl"><SoloStudyScene preferences={preferences}/></div>}
    {update.isError && <p role="alert" className="mt-2 text-small text-text-muted">{t("settings.saveError")}</p>}
  </section>;
}
