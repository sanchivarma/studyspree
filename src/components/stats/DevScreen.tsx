"use client";
import Link from "next/link";
import { AccountControls } from "@/components/layout/AccountControls";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useSeedSessions } from "@/hooks/useSeedSessions";
import { useTranslation } from "@/hooks/useTranslation";

export function DevScreen() {
  const { t } = useTranslation();
  const active = useActiveSession();
  const seed = useSeedSessions();
  return <section className="mx-auto w-full max-w-2xl px-6 pt-24 pb-8">
    <AccountControls />
    <h1 className="mb-6 text-title">{t("dev.title")}</h1>
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-small text-text-muted">{t("dev.description")}</p>
      <button type="button" onClick={() => seed.mutate()} disabled={seed.isPending || active.isPending || Boolean(active.data)}
        className="mt-5 min-h-12 rounded-xl bg-accent px-5 font-semibold text-background disabled:opacity-60">{t("dev.seed")}</button>
      {active.data && <p role="status" className="mt-4 text-small text-text-muted">{t("dev.activeSession")}</p>}
      {seed.isSuccess && <p role="status" className="mt-4 text-small text-text-muted">{t("dev.success")}</p>}
      {seed.error && <p role="alert" className="mt-4 text-small text-text-muted">{t("dev.error")}</p>}
      <Link href="/stats" className="mt-5 block min-h-11 w-fit rounded-lg py-3 text-small text-accent">{t("dev.viewStats")}</Link>
    </div>
  </section>;
}
