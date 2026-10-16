"use client";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useEmailInvitation } from "@/hooks/useEmailInvitation";
import { InvitationError } from "@/lib/repo/invitations";
export function InviteEmailForm({ delivery }: { delivery: "smtp" | "resend" | "mailpit" | "unavailable" }) {
  const { t } = useTranslation();
  const mutation = useEmailInvitation();
  const [email, setEmail] = useState("");
  return <section className="mx-auto max-w-xl space-y-5 p-6 md:py-12" data-testid="email-invitation">
    <h1 className="text-title">{t("invitations.title")}</h1><p className="text-text-muted">{t("invitations.description")}</p>
    {delivery === "mailpit" && <p className="text-small text-text-muted">{t("invitations.localNotice")}</p>}
    {delivery === "unavailable" && <p role="status">{t("invitations.notConfigured")}</p>}
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); mutation.mutate(email); }}>
      <label className="block">{t("common.email")}<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => { setEmail(event.target.value); mutation.reset(); }} className="mt-2 block min-h-12 w-full rounded-xl border border-border bg-surface px-3"/></label>
      <button disabled={mutation.isPending || delivery === "unavailable"} className="min-h-12 rounded-xl bg-accent px-5 font-semibold text-background disabled:opacity-50">{t("invitations.send")}</button>
    </form>
    {mutation.isSuccess && <p role="status">{t(mutation.data.delivery === "captured" ? "invitations.captured" : "invitations.sent")}</p>}
    {mutation.isError && <p role="alert">{t(`invitations.${mutation.error instanceof InvitationError ? mutation.error.code : "unavailable"}`)}</p>}
    {delivery === "mailpit" && <a href="http://localhost:54324" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline">{t("invitations.openInbox")}</a>}
  </section>;
}
