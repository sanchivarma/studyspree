"use client";

import { useLinkStatus } from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

/** Feedback lives inside a Link and never holds ready page content behind a fallback. */
export function PendingNavigation() {
  const { pending } = useLinkStatus();
  const { t } = useTranslation();
  return pending ? <span role="status" aria-label={t("common.working")} className="absolute right-1 bottom-1 size-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" /> : null;
}
