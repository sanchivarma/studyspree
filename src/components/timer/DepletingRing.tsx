"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { now } from "@/lib/clock";
import { remainingOffset } from "@/lib/session/ring";
import { useTranslation } from "@/hooks/useTranslation";

type Props = { elapsedSeconds: number; totalSeconds: number | null; size: number; strokeWidth: number; accent: string };

export function DepletingRing({ elapsedSeconds, totalSeconds, size, strokeWidth, accent }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const circle = useRef<SVGCircleElement>(null);
  const tick = useRef({ elapsed: elapsedSeconds, at: 0 });
  const minute = useRef<number | null>(null);
  const initialOffset = useRef(totalSeconds === null ? 0 : remainingOffset(elapsedSeconds, totalSeconds, circumference));

  useLayoutEffect(() => {
    tick.current = { elapsed: elapsedSeconds, at: now().getTime() };
    if (document.hidden) return;
    if (reducedMotion) {
      const bucket = Math.floor(elapsedSeconds / 60);
      if (minute.current === bucket) return;
      minute.current = bucket;
    } else minute.current = null;
    circle.current?.setAttribute("stroke-dashoffset", String(totalSeconds === null ? 0 : remainingOffset(elapsedSeconds, totalSeconds, circumference)));
  }, [elapsedSeconds, totalSeconds, circumference, reducedMotion]);

  useEffect(() => {
    let frame: number | undefined;
    let rotationStartedAt = now().getTime();
    const paint = () => {
      if (document.hidden) return;
      const timestamp = now().getTime();
      const offset = totalSeconds === null
        ? -(((timestamp - rotationStartedAt) % 40_000) / 40_000) * circumference
        : remainingOffset(tick.current.elapsed + Math.min(1, Math.max(0, timestamp - tick.current.at) / 1000), totalSeconds, circumference);
      circle.current?.setAttribute("stroke-dashoffset", String(offset));
      frame = requestAnimationFrame(paint);
    };
    const visibility = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      if (document.hidden) return;
      if (reducedMotion) {
        circle.current?.setAttribute("stroke-dashoffset", String(totalSeconds === null ? 0 : remainingOffset(tick.current.elapsed, totalSeconds, circumference)));
        minute.current = Math.floor(tick.current.elapsed / 60);
      } else {
        rotationStartedAt = now().getTime();
        frame = requestAnimationFrame(paint);
      }
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [totalSeconds, circumference, reducedMotion]);

  const remaining = totalSeconds === null ? undefined : Math.round(Math.max(0, 1 - elapsedSeconds / totalSeconds) * 100);
  return <svg role="progressbar" aria-label={t("session.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={remaining}
    width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-white/10" />
    <circle ref={circle} data-testid="depleting-arc" cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={accent} strokeWidth={strokeWidth} strokeLinecap="round"
      strokeDasharray={totalSeconds === null ? `${circumference / 4} ${circumference * 3 / 4}` : circumference}
      strokeDashoffset={initialOffset.current} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
  </svg>;
}
