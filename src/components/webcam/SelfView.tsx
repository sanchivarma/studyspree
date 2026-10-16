/**
 * PRIVACY CONTRACT
 * This component renders a LOCAL camera preview only. The MediaStream is
 * attached to a <video> element via srcObject and nothing else. It is never
 * uploaded, recorded, sent to a peer, drawn to a canvas for transmission,
 * or passed to any network API. Any change that introduces network access
 * to this stream breaks an explicit promise made to users.
 */
"use client";

import { useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { CameraOff, Grip, Pin, PinOff, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { useLocalCamera } from "@/hooks/useLocalCamera";
import type { WebcamCorner } from "@/types/domain";
import { cn } from "@/lib/utils";

function subscribeResize(change: () => void) {
  window.addEventListener("resize", change);
  return () => window.removeEventListener("resize", change);
}
const viewport = () => `${window.innerWidth}:${window.innerHeight}`;
const serverViewport = () => "1024:768";
const positions: Record<WebcamCorner, string> = {
  "top-left": "top-56 left-4 sm:top-6 sm:left-6",
  "top-right": "top-56 right-4 sm:top-6 sm:right-6",
  "bottom-left": "bottom-36 left-4 sm:left-6",
  "bottom-right": "bottom-20 right-4 sm:bottom-6 sm:right-6",
};

export function SelfView({ camera, visible, mirrored = true, status = "", stage = false, onTogglePin }: { camera: ReturnType<typeof useLocalCamera>; visible: boolean; mirrored?: boolean; status?: string; stage?: boolean; onTogglePin?: () => void }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [width, height] = useSyncExternalStore(subscribeResize, viewport, serverViewport).split(":").map(Number);
  const [tappedOpen, setTappedOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const expanded = camera.isReady && (tappedOpen || hovered) && visible;
  const scale = expanded ? Math.max(0.375, Math.min(1, (width - 32) / 320, (height - 304) / 240)) : 0.375;
  const isLeft = camera.corner.endsWith("left");
  const isTop = camera.corner.startsWith("top");
  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null; setOffset({ x: 0, y: 0 });
    camera.moveTo(`${event.clientY < height / 2 ? "top" : "bottom"}-${event.clientX < width / 2 ? "left" : "right"}`);
  };
  if (stage && camera.isReady) return <div data-testid="self-view-pinned" className="ph-no-capture relative min-h-40 overflow-hidden rounded-lg bg-surface">
    <video ref={camera.videoRef} data-testid="local-camera-video" autoPlay muted playsInline aria-label={t("webcam.preview")} className="ph-no-capture absolute inset-0 h-full w-full object-cover" style={{ transform: mirrored ? "scaleX(-1)" : undefined }}/>
    <div className={cn("absolute top-1 right-1 flex gap-1", !visible && "pointer-events-none opacity-0")}>
      <button type="button" onClick={onTogglePin} aria-label={t("calendar.unpinSelf")} className="flex size-11 items-center justify-center rounded-xl bg-background/75"><PinOff className="size-4"/></button>
      <button type="button" onClick={camera.disable} aria-label={t("webcam.disable")} className="flex size-11 items-center justify-center rounded-xl bg-background/75"><CameraOff className="size-4"/></button>
    </div>
  </div>;
  return <div data-testid="self-view" data-corner={camera.corner} data-expanded={expanded}
    onPointerEnter={event => { if (camera.isReady && event.pointerType === "mouse") setHovered(true); }}
    onPointerMove={event => { if (camera.isReady && event.pointerType === "mouse" && !drag.current) setHovered(true); }}
    onPointerLeave={() => setHovered(false)}
    className={cn("ph-no-capture absolute z-20 h-[90px] w-[120px] transition-opacity duration-200 motion-reduce:transition-none", positions[camera.corner], visible ? "opacity-100" : "pointer-events-none opacity-0")}
    style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}>
    {camera.isReady ? <>
      <button type="button" aria-label={t(expanded ? "webcam.collapse" : "webcam.expand")} aria-expanded={expanded}
        onClick={() => setTappedOpen(value => !value)}
        className={cn("absolute h-[240px] w-[320px] overflow-hidden rounded-[32px] border border-border bg-surface transition-transform duration-200", isLeft ? "left-0" : "right-0", isTop ? "top-0" : "bottom-0")}
        style={{ transform: `scale(${scale})`, transformOrigin: `${isLeft ? "left" : "right"} ${isTop ? "top" : "bottom"}`, transitionDuration: reducedMotion ? "0ms" : undefined }}>
        <video ref={camera.videoRef} data-testid="local-camera-video" autoPlay muted playsInline aria-label={t("webcam.preview")}
          className="ph-no-capture h-full w-full object-cover" style={{ transform: mirrored ? "scaleX(-1)" : undefined }} />
      </button>
      <button type="button" onClick={camera.disable} aria-label={t("webcam.disable")}
        className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-xl bg-background/70 text-foreground hover:bg-background/90">
        <CameraOff aria-hidden="true" className="size-4" />
      </button>
    </> : <button type="button" onClick={camera.enable} disabled={camera.isPending} aria-label={t("webcam.enable")}
      className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-surface/30 text-small text-text-muted disabled:opacity-60">
      <span>{t("session.camera")}</span>
    </button>}
    <button type="button" aria-label={t("webcam.move")} title={t("webcam.moveHint")}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={event => {
        if (drag.current?.id === event.pointerId) setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
      }} onPointerUp={finishDrag} onPointerCancel={() => { drag.current = null; setOffset({ x: 0, y: 0 }); }}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const vertical = event.key === "ArrowUp" ? "top" : event.key === "ArrowDown" ? "bottom" : isTop ? "top" : "bottom";
        const horizontal = event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : isLeft ? "left" : "right";
        camera.moveTo(`${vertical}-${horizontal}`);
      }}
      className="absolute top-0 left-0 flex size-11 touch-none items-center justify-center rounded-xl bg-background/70 text-text-muted hover:text-foreground">
      <Grip aria-hidden="true" className="size-4" />
    </button>
    {status && <p className="absolute right-0 bottom-0 left-0 truncate rounded-b-xl bg-background/80 px-2 py-1 text-[11px]">{status}</p>}
    {camera.isReady && onTogglePin && <button type="button" onClick={onTogglePin} aria-label={t("calendar.pinSelf")} className="absolute right-0 bottom-0 flex size-11 items-center justify-center rounded-xl bg-background/75"><Pin className="size-4"/></button>}
    {camera.permissionNote && <div role="status" data-testid="camera-permission-note"
      className={cn("absolute z-30 flex w-[min(288px,calc(100dvw-2rem))] items-center gap-1 rounded-xl bg-surface px-3 text-small text-foreground", isLeft ? "left-0" : "right-0", isTop ? "top-full mt-2" : "bottom-full mb-2")}>
      <p>{t("webcam.permissionNote")}</p>
      <button type="button" onClick={camera.dismissNote} aria-label={t("webcam.dismiss")}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg"><X aria-hidden="true" className="size-4" /></button>
    </div>}
  </div>;
}
