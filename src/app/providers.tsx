"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { LanguageProvider } from "@/components/layout/LanguageProvider";
import { AuthFeedbackProvider } from "@/components/auth/AuthFeedbackProvider";
import type { Locale } from "@/translations";
import { SceneMediaProvider } from "@/components/scene/SceneMediaProvider";
import type { SceneMediaManifest } from "@/lib/characters/mediaTypes";

export function Providers({ children, initialLocale, mediaManifest }: { children: React.ReactNode; initialLocale: Locale; mediaManifest: SceneMediaManifest }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SceneMediaProvider manifest={mediaManifest}><MotionConfig reducedMotion="user"><LanguageProvider initialLocale={initialLocale}><AuthFeedbackProvider>{children}</AuthFeedbackProvider></LanguageProvider></MotionConfig></SceneMediaProvider>
    </QueryClientProvider>
  );
}
