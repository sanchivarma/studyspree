"use client";
import { useCallback, useSyncExternalStore } from "react";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";

function subscribe(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => { window.clearInterval(interval); window.removeEventListener("focus", onChange); document.removeEventListener("visibilitychange", onChange); };
}

export function useLocalDate(timezone: string | undefined): string | null {
  const snapshot = useCallback(() => timezone ? toLocalDate(now(), timezone) : null, [timezone]);
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
