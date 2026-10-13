"use client";

import { useSyncExternalStore } from "react";
import { now } from "@/lib/clock";

const subscribe = () => () => {};
const getSnapshot = () => now().getHours();

export function useCurrentHour(initialHour: number) {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialHour);
}
