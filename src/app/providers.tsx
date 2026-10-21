"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { LanguageProvider } from "@/components/layout/LanguageProvider";
import { AuthFeedbackProvider } from "@/components/auth/AuthFeedbackProvider";
import type { Dictionary, Locale } from "@/translations/locale";
import { SceneMediaProvider } from "@/components/scene/SceneMediaProvider";
import type { SceneMediaManifest } from "@/lib/themes/mediaTypes";

export function Providers({ children, initialLocale, initialDictionary, mediaManifest }: { children: React.ReactNode; initialLocale: Locale; initialDictionary: Dictionary; mediaManifest: SceneMediaManifest }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SceneMediaProvider manifest={mediaManifest}><LanguageProvider initialLocale={initialLocale} initialDictionary={initialDictionary}><AuthFeedbackProvider>{children}</AuthFeedbackProvider></LanguageProvider></SceneMediaProvider>
    </QueryClientProvider>
  );
}
