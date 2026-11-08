import { createUuid } from "@/lib/uuid";
import { z } from "zod";

export const browserTabSchema = z.object({ tabId: z.uuid(), documentId: z.uuid(), reload: z.boolean() }).strict();
export type BrowserTab = z.infer<typeof browserTabSchema>;
let identity: BrowserTab | undefined;

/** sessionStorage survives reload, but a newly opened tab gets a new identity. */
export function browserTab(): BrowserTab | undefined {
  if (typeof window === "undefined") return undefined;
  if (identity) return identity;
  let tabId: string;
  try {
    const stored = z.uuid().safeParse(window.sessionStorage.getItem("ss_browser_tab"));
    tabId = stored.success ? stored.data : createUuid();
    window.sessionStorage.setItem("ss_browser_tab", tabId);
  } catch { tabId = createUuid(); }
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  identity = { tabId, documentId: createUuid(), reload: navigation?.type === "reload" };
  return identity;
}

export function restoreBrowserTab() {
  const previous = browserTab();
  if (previous) identity = { ...previous, documentId: createUuid(), reload: true };
}
