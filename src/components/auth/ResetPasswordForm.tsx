"use client";

import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const { execute, isPending, result } = useAuth();
  return <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-6 p-6">
    <div className="self-end"><LanguageSelector /></div>
    <h1 className="text-title">{t("recovery.title")}</h1>
    <form noValidate className="space-y-5" onSubmit={(event) => { event.preventDefault(); void execute("updatePassword", new FormData(event.currentTarget).get("password")); }}>
      <div className="space-y-2 text-small text-text-muted"><label htmlFor="new-password" className="block">{t("recovery.newPassword")}</label>
        <input id="new-password" name="password" type="password" required minLength={8} maxLength={64} autoComplete="new-password" aria-describedby="password-help" className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-foreground" />
        <span id="password-help" className="block">{t("common.passwordHelp")}</span>
      </div>
      <button disabled={isPending} className="h-14 w-full rounded-2xl bg-accent font-semibold text-background disabled:opacity-50">{t(isPending ? "common.working" : "recovery.savePassword")}</button>
    </form>
    <p role="status" className="text-small text-text-muted">{result?.message && t(result.message)}</p>
  </main>;
}
