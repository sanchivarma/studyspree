"use client";

import { useState, type FormEvent } from "react";
import { SceneVideo } from "@/components/scene/SceneVideo";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/translations";

const inputClass = "h-12 w-full rounded-xl border border-border bg-background/50 px-4 text-body text-foreground";

export function AuthScreen({ isConfigured, allowOAuth = true, hasDevLogin = false, hasCallbackError = false, initialMode = "login" }: { isConfigured: boolean; allowOAuth?: boolean; hasDevLogin?: boolean; hasCallbackError?: boolean; initialMode?: "login" | "register" }) {
  const { t } = useTranslation();
  const { execute, isPending, result, clearResult } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "reset">(initialMode);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (mode === "reset") { void execute("reset", values.get("email")); return; }
    const credentials = { username: values.get("username"), password: values.get("password") };
    void execute(mode, mode === "login" ? credentials : { ...credentials, firstName: values.get("firstName"), lastName: values.get("lastName"), email: values.get("email") });
  }

  function field(name: string, label: TranslationKey, type = "text", autoComplete = name, help?: TranslationKey) {
    return (
      <div className="space-y-2 text-small text-text-muted" key={name}>
        <label htmlFor={`auth-${name}`} className="block">{t(label)}</label>
        <input id={`auth-${name}`} name={name} type={type} required autoComplete={autoComplete} className={inputClass}
          minLength={name === "password" && mode === "register" ? 8 : undefined}
          maxLength={name === "password" ? 64 : name === "username" ? 30 : name === "email" ? 254 : 80}
          pattern={name === "username" ? "[A-Za-z0-9_]{3,30}" : undefined}
          aria-describedby={help ? `${name}-help` : undefined} />
        {help && <span id={`${name}-help`} className="block text-small">{t(help)}</span>}
      </div>
    );
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <SceneVideo slug="rain-desk" priority />
      <div aria-hidden="true" className="start-screen-scrim pointer-events-none absolute inset-0" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 p-6">
        <span className="text-body font-semibold tracking-tight">StudySpree</span>
        <LanguageSelector />
      </header>
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pt-6 pb-12 md:grid-cols-2 md:items-center md:gap-16 md:py-16">
        <section>
          <h1 className="max-w-lg text-4xl leading-tight font-semibold tracking-tight md:text-5xl">{t("common.tagline")}</h1>
          <p className="mt-5 text-body whitespace-pre-line text-text-muted">{t("common.welcome")}</p>
        </section>
        <section className="w-full max-w-[480px] rounded-3xl border border-border bg-surface/90 p-6 shadow-xl md:justify-self-end md:p-8">
          {mode !== "reset" ? (
            <div role="tablist" aria-label={t("common.accountTabs")} className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-background/60 p-1">
              {(["login", "register"] as const).map((tab) => <button key={tab} id={`${tab}-tab`} role="tab" aria-selected={mode === tab} aria-controls="auth-panel" type="button"
                tabIndex={mode === tab ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
                  event.preventDefault();
                  const next = event.key === "Home" ? "login" : event.key === "End" ? "register" : tab === "login" ? "register" : "login";
                  setMode(next); clearResult(); document.getElementById(`${next}-tab`)?.focus();
                }}
                onClick={() => { setMode(tab); clearResult(); }} className={cn("min-h-11 rounded-lg text-small font-medium", mode === tab ? "bg-surface-2 text-foreground" : "text-text-muted")}>{t(tab === "login" ? "login.title" : "register.title")}</button>)}
            </div>
          ) : <h2 className="mb-3 text-title">{t("recovery.title")}</h2>}

          <div id="auth-panel" role={mode === "reset" ? undefined : "tabpanel"} aria-labelledby={mode === "reset" ? undefined : `${mode}-tab`}>
            {mode !== "reset" && allowOAuth ? <>
              <div className="grid gap-3">
                <button disabled={!isConfigured || isPending} type="button" onClick={() => void execute("google")} className="min-h-12 rounded-xl border border-border bg-background/30 px-4 text-small disabled:opacity-50">{t("common.google")}</button>
                <button disabled={!isConfigured || isPending} type="button" onClick={() => void execute("facebook")} className="min-h-12 rounded-xl border border-border bg-background/30 px-4 text-small disabled:opacity-50">{t("common.facebook")}</button>
              </div>
              <div className="my-5 flex items-center gap-3 text-small text-text-muted"><span className="h-px flex-1 bg-border" /><span>{t("common.or")}</span><span className="h-px flex-1 bg-border" /></div>
            </> : <p className="mb-6 text-small text-text-muted">{t("recovery.help")}</p>}

            {mode === "login" && <form noValidate onSubmit={event => {
              event.preventDefault(); void execute("magicLink", new FormData(event.currentTarget).get("email"));
            }} className="mb-6 space-y-3 border-b border-border pb-6">
              <label htmlFor="magic-email" className="block text-small text-text-muted">{t("common.email")}</label>
              <input id="magic-email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} />
              <button type="submit" disabled={!isConfigured || isPending} className="min-h-12 w-full rounded-xl border border-border px-4 text-small disabled:opacity-50">{t("login.sendLink")}</button>
            </form>}
            <form key={mode} noValidate onSubmit={submit} className="space-y-4">
              {mode === "register" && <div className="grid gap-4 sm:grid-cols-2">{field("firstName", "common.firstName", "text", "given-name")}{field("lastName", "common.lastName", "text", "family-name")}</div>}
              {mode !== "login" && field("email", "common.email", "email", "email")}
              {mode !== "reset" && <>
                {field("username", "common.username", "text", "username", mode === "register" ? "register.usernameHelp" : undefined)}
                {field("password", "common.password", "password", mode === "register" ? "new-password" : "current-password", mode === "register" ? "common.passwordHelp" : undefined)}
              </>}
              {mode === "login" && <button type="button" onClick={() => { setMode("reset"); clearResult(); }} className="min-h-11 text-small text-accent">{t("login.forgotPassword")}</button>}
              <button disabled={isPending || (!isConfigured && !(mode === "login" && hasDevLogin))} type="submit" className="h-14 w-full rounded-2xl bg-accent px-4 text-body font-semibold text-background disabled:opacity-50">
                {t(isPending ? "common.working" : mode === "login" ? "login.submit" : mode === "register" ? "register.submit" : "recovery.submit")}
              </button>
            </form>
            {mode === "reset" && <button type="button" onClick={() => { setMode("login"); clearResult(); }} className="mt-3 min-h-11 text-small text-text-muted">{t("recovery.backLogin")}</button>}
            <div role="status" aria-live="polite" className="mt-4 text-small text-text-muted">
              {result ? mode !== "login" && result.message ? t(result.message) : null : hasCallbackError ? t("common.authError") : !isConfigured && !(mode === "login" && hasDevLogin) ? t("common.authUnavailable") : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
