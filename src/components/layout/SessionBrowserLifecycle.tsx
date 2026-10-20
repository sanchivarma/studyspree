"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveSession } from "@/hooks/useActiveSession";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import { restoreBrowserTab } from "@/lib/session/browserTab";

/** pagehide means the document is leaving. Blur/hidden never finish study. */
export function SessionBrowserLifecycle() {
  const { data: session } = useActiveSession();
  const cache = useQueryClient();
  const id = session?.endedAt === null ? session.id : undefined;
  useEffect(() => {
    if (!id) return;
    const close = () => repo.releaseSessionTab(id);
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      restoreBrowserTab();
      void cache.invalidateQueries({ queryKey: queryKeys.activeSession() });
      void cache.invalidateQueries({ queryKey: queryKeys.stats.session(id) });
    };
    window.addEventListener("pagehide", close);
    window.addEventListener("pageshow", restore);
    // Heartbeats continue when the open tab is hidden. Visual ticks may pause.
    const heartbeat = window.setInterval(() => { void repo.heartbeat(id).catch(() => {}); }, 60_000);
    return () => {
      window.removeEventListener("pagehide", close);
      window.removeEventListener("pageshow", restore);
      window.clearInterval(heartbeat);
    };
  }, [id, cache]);
  return null;
}
