"use client";

import { useMemo, useSyncExternalStore } from "react";

const serverOptions = ["UTC"];
const subscribe = () => () => {};
let browserOptions: string[] | undefined;
function getSnapshot() {
  if (!browserOptions) {
    try { browserOptions = Intl.supportedValuesOf("timeZone"); } catch { browserOptions = []; }
  }
  return browserOptions;
}

export function useTimezones(savedTimezone: string | undefined) {
  // Node and browser ICU versions can differ. Hydrate the same small list,
  // then read browser options, always retaining the user's saved timezone.
  const supported = useSyncExternalStore(subscribe, getSnapshot, () => serverOptions);
  return useMemo(() => [...new Set(["UTC", savedTimezone ?? "UTC", ...supported])].sort(), [savedTimezone, supported]);
}
