"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";
import { WindowMotionCanvas } from "./WindowMotionCanvas";

export function SoloWindowVideo({ slug, onReady }: { slug: SoloScenePreferences["window"]; onReady: (ready:boolean)=>void }) {
  const ref=useRef<HTMLVideoElement>(null), reduced=useReducedMotion(), visible=usePageVisibility();
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const video=ref.current;if(!video)return;
    if(!visible||reduced)video.pause();else void video.play().catch(()=>{});
    return ()=>video.pause();
  },[visible,reduced]);
  if(reduced)return null;
  return <><video ref={ref} data-testid="solo-window-video" src={`/solo/views/${slug}-motion-v1.mp4`} muted loop playsInline autoPlay preload="auto"
    className={`absolute inset-0 size-full object-cover transition-opacity duration-600 ${ready?"opacity-100":"opacity-0"}`}
    onCanPlayThrough={event=>{setReady(true);onReady(true);if(document.hidden)event.currentTarget.pause();else void event.currentTarget.play().catch(()=>{});}}
    onError={()=>{setReady(false);onReady(false);}}/>
    <WindowMotionCanvas video={ref} slug={slug} visible={visible}/></>;
}
