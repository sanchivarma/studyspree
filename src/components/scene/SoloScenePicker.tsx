"use client";
/* eslint-disable @next/next/no-img-element -- Local static thumbnails preserve transparent desk artwork. */
import type { KeyboardEvent } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { defaultSoloScene, deskSlugs, windowSlugs, deskPreviewSource, windowSource } from "@/lib/soloScenes/catalog";

export function SoloScenePicker({disabled=false}:{disabled?:boolean}) {
  const profile=useProfile(), update=useUpdateProfile(), {t}=useTranslation();
  const value=profile.data?.soloScene??defaultSoloScene;
  const navigate=(event:KeyboardEvent<HTMLFieldSetElement>)=>{
    const steps:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-2,ArrowDown:2};
    if(!(event.key in steps))return;
    const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const index=buttons.indexOf(event.target as HTMLButtonElement);if(index<0)return;
    event.preventDefault();buttons[(index+steps[event.key]+buttons.length)%buttons.length]?.focus();
  };
  const card="overflow-hidden rounded-xl border bg-surface text-left focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50";
  return <div className="space-y-5" data-testid="solo-scene-picker">
    <fieldset disabled={disabled} onKeyDown={navigate}><legend className="mb-2 text-small font-semibold">{t("soloScene.desk")}</legend>
      <div className="grid grid-cols-2 gap-2">{deskSlugs.map(slug=><button key={slug} type="button" aria-pressed={value.desk===slug} onClick={()=>update.mutate({soloScene:{...value,desk:slug}})} className={`${card} ${value.desk===slug?"border-accent":"border-border"}`}>
        <img src={deskPreviewSource(slug)} alt="" loading="lazy" className="aspect-video w-full object-cover"/><span className="block min-h-11 px-2 py-2 text-small">{t(`soloScene.desk-${slug}`)}</span>
      </button>)}</div>
    </fieldset>
    <fieldset disabled={disabled} onKeyDown={navigate}><legend className="mb-2 text-small font-semibold">{t("soloScene.window")}</legend>
      <div className="grid grid-cols-2 gap-2">{windowSlugs.map(slug=><button key={slug} type="button" aria-pressed={value.window===slug} onClick={()=>update.mutate({soloScene:{...value,window:slug}})} className={`${card} ${value.window===slug?"border-accent":"border-border"}`}>
        <img src={windowSource(slug)} alt="" loading="lazy" className="aspect-video w-full object-cover"/><span className="block min-h-11 px-2 py-2 text-small">{t(`soloScene.window-${slug}`)}</span>
      </button>)}</div>
    </fieldset>
    {update.isError&&<p role="alert" className="text-small text-text-muted">{t("settings.saveError")}</p>}
  </div>;
}
