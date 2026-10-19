"use client";

/* eslint-disable @next/next/no-img-element -- Layered local decorative assets keep native alpha and fixed layout. */
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useState } from "react";
import { SoloWindowVideo } from "./SoloWindowVideo";
import { SoloSceneDetails } from "./SoloSceneDetails";
import { SoloDeskLight } from "./SoloDeskLight";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { deskSource, windowSource, windowFrame, type SoloScenePreferences } from "@/lib/soloScenes/catalog";

/** Decorative POV only: changing the desk or window never writes session state. */
export function SoloStudyScene({ preferences }: { preferences: SoloScenePreferences }) {
  const reducedMotion = useReducedMotion(), visible = usePageVisibility();
  const [readyView,setReadyView]=useState<string|null>(null);
  const view = preferences.window;
  const frame = windowFrame(view);
  return <div aria-hidden="true" data-testid="solo-study-scene" data-desk={preferences.desk} data-window={view}
    data-frame={frame??"none"} data-video-ready={readyView===view&&!reducedMotion} data-motion={visible && !reducedMotion ? "running" : "paused"} className="solo-study-scene">
    <div data-testid="solo-window" className="solo-window">
      <img key={`poster:${view}`} src={windowSource(view)} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" onError={event => { event.currentTarget.style.visibility = "hidden"; }}/>
      <SoloWindowVideo key={`video:${view}`} slug={view} onReady={ready=>setReadyView(ready?view:null)}/>
      {!reducedMotion && <SoloSceneDetails view={view}/>}
      <div className="solo-glass"/>
    </div>
    {frame&&<img key={`frame:${frame}`} src={`/solo/frames/${frame}-v2.webp`} alt="" className="solo-window-surround" fetchPriority="high"/>}
    <img key={`desk:${preferences.desk}`} src={deskSource(preferences.desk)} alt="" className="solo-desk" fetchPriority="high" onError={event => { event.currentTarget.style.visibility = "hidden"; }}/>
    <SoloDeskLight desk={preferences.desk} animate={visible&&!reducedMotion}/>
  </div>;
}
