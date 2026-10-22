"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { windowVideoSource, type SoloScenePreferences } from "@/lib/soloScenes/catalog";

export function SoloWindowVideo({ slug, onReady }: { slug: SoloScenePreferences["window"]; onReady: (ready:boolean)=>void }) {
  const ref=useRef<HTMLVideoElement>(null), reduced=useReducedMotion(), visible=usePageVisibility();
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const video=ref.current;if(!video)return;
    if(!visible||reduced)video.pause();else void video.play().catch(()=>{});
    return ()=>video.pause();
  },[visible,reduced]);
  if(reduced)return null;
  return <video ref={ref} data-testid="solo-window-video" src={windowVideoSource(slug)} muted loop playsInline autoPlay preload="auto"
    onLoadedMetadata={event=>{const rate=slug==="magic-academy"?0.8:0.65;event.currentTarget.defaultPlaybackRate=rate;event.currentTarget.playbackRate=rate;}}
    className={`absolute inset-0 size-full object-cover transition-opacity duration-600 ${ready?"opacity-100":"opacity-0"}`}
    onCanPlayThrough={event=>{setReady(true);onReady(true);if(document.hidden)event.currentTarget.pause();else void event.currentTarget.play().catch(()=>{});}}
    onError={()=>{setReady(false);onReady(false);}}/>;
}
