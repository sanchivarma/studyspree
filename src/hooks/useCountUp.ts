"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { now } from "@/lib/clock";

export function useCountUp(from: number, to: number, duration: number) {
  const [value, setValue] = useState(from);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) { setValue(to); return; }
    let frame: number | undefined;
    let startedAt: number | null = null;
    let activeElapsed = 0;
    let progress = 0;

    const tick = () => {
      if (startedAt === null) return;
      const elapsed = activeElapsed + Math.max(0, now().getTime() - startedAt);
      progress = Math.max(progress, Math.min(1, elapsed / duration));
      const eased = 1 - (1 - progress) ** 3;
      setValue((previous) => Math.max(previous, progress === 1 ? to : from + (to - from) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      window.cancelAnimationFrame(frame ?? 0);
      if (document.hidden) {
        if (startedAt !== null) activeElapsed += Math.max(0, now().getTime() - startedAt);
        startedAt = null;
      } else if (startedAt === null && progress < 1) {
        startedAt = now().getTime();
        frame = window.requestAnimationFrame(tick);
      }
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.cancelAnimationFrame(frame ?? 0);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [from, to, duration, reducedMotion]);

  // Keep the first client render identical to the server-rendered value.
  return value;
}
