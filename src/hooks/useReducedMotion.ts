"use client";
import { useSyncExternalStore } from "react";
import { useProfile } from "./useProfile";

const query = "(prefers-reduced-motion: reduce)";
function subscribe(change: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}
const snapshot = () => window.matchMedia(query).matches;
export function useReducedMotion(): boolean {
  const profile = useProfile();
  const system = useSyncExternalStore(subscribe, snapshot, () => false);
  return system || Boolean(profile.data?.reduceMotion);
}
