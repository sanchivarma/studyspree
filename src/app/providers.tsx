"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { LanguageProvider } from "@/components/layout/LanguageProvider";
import type { Locale } from "@/translations";

export function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user"><LanguageProvider initialLocale={initialLocale}>{children}</LanguageProvider></MotionConfig>
    </QueryClientProvider>
  );
}
