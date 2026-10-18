"use client";

/* eslint-disable @next/next/no-img-element -- Layered local decorative assets keep native alpha and fixed layout. */
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { deskSource, windowSource, windowFrame, type SoloScenePreferences } from "@/lib/soloScenes/catalog";

/** Decorative POV only: changing the desk or window never writes session state. */
export function SoloStudyScene({ preferences }: { preferences: SoloScenePreferences }) {
  const reducedMotion = useReducedMotion(), visible = usePageVisibility();
  const view = preferences.window;
  const celestial = view === "space" || view === "blackhole";
  const aquatic = view === "underwater";
  const water = ["sea", "sailing-ships", "mountains", "hogwarts", "rivendell", "underwater"].includes(view);
  return <div aria-hidden="true" data-testid="solo-study-scene" data-desk={preferences.desk} data-window={view}
    data-frame={windowFrame(view)} data-motion={visible && !reducedMotion ? "running" : "paused"} className="solo-study-scene">
    <div data-testid="solo-window" className="solo-window">
      <img key={view} src={windowSource(view)} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" onError={event => { event.currentTarget.style.visibility = "hidden"; }}/>
      {!celestial && !aquatic && <img src="/solo/motion/cloud-overlay-v1.webp" alt="" className="solo-outside-motion solo-clouds"/>}
      {view === "sailing-ships" && <img src="/solo/motion/ship-overlay-v2.webp" alt="" className="solo-outside-motion solo-ship"/>}
      {celestial && <svg className="solo-outside-motion solo-stars" viewBox="0 0 1000 600" preserveAspectRatio="none">{Array.from({length:24},(_,i)=><circle key={i} cx={(i*137+53)%1000} cy={(i*97+19)%600} r={i%3===0?1.1:0.6} fill="currentColor"/>)}</svg>}
      {aquatic && <svg className="solo-outside-motion solo-bubbles" viewBox="0 0 1000 600" preserveAspectRatio="none">{Array.from({length:12},(_,i)=><circle key={i} cx={(i*149+31)%1000} cy={(i*83+71)%600} r={i%3+1.5} fill="none" stroke="currentColor" strokeWidth="0.6"/>)}</svg>}
      {water && <div className="solo-outside-motion solo-water-light"/>}
      <div className="solo-glass"/>
      <div className="solo-window-bar"/>
    </div>
    <img key={preferences.desk} src={deskSource(preferences.desk)} alt="" className="solo-desk" fetchPriority="high" onError={event => { event.currentTarget.style.visibility = "hidden"; }}/>
  </div>;
}
