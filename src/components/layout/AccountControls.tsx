"use client";

import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

export function AccountControls() {
  const { execute, isPending, result } = useAuth();
  const { t } = useTranslation();
  return <div data-testid="account-controls" className="absolute top-4 right-4 z-10 flex max-w-full flex-wrap items-center justify-end gap-3 pl-4">
    <LanguageSelector />
    <button type="button" disabled={isPending} onClick={() => void execute("logout")} className="min-h-11 shrink-0 rounded-full border border-border bg-surface/80 px-5 text-small text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{t("common.logout")}</button>
    {result?.message && <p role="status" className="w-full text-right text-small text-text-muted">{t(result.message)}</p>}
  </div>;
}
