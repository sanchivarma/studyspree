"use client";

import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

export function AccountControls() {
  const { execute, isPending, result } = useAuth();
  const { t } = useTranslation();
  return <div className="absolute top-4 right-4 z-10 flex max-w-full flex-wrap items-center justify-end gap-3 pl-4">
    <button type="button" disabled={isPending} onClick={() => void execute("logout")} className="min-h-11 rounded-xl px-3 text-small text-text-muted">{t("common.logout")}</button>
    <LanguageSelector />
    {result?.message && <p role="status" className="w-full text-right text-small text-text-muted">{t(result.message)}</p>}
  </div>;
}
