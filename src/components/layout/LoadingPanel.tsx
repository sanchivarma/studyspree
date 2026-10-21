"use client";

import { useTranslation } from "@/hooks/useTranslation";

export function LoadingPanel() {
  const { t } = useTranslation();
  return <div role="status" aria-busy="true" className="space-y-4 py-5">
    <span className="sr-only">{t("common.working")}</span>
    <div aria-hidden="true" className="h-6 w-40 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
    <div aria-hidden="true" className="h-28 animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none" />
  </div>;
}
