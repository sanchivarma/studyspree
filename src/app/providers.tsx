"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { LanguageProvider } from "@/components/layout/LanguageProvider";
import { AuthFeedbackProvider } from "@/components/auth/AuthFeedbackProvider";
import type { Locale } from "@/translations";

export function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user"><LanguageProvider initialLocale={initialLocale}><AuthFeedbackProvider>{children}</AuthFeedbackProvider></LanguageProvider></MotionConfig>
    </QueryClientProvider>
  );
}
