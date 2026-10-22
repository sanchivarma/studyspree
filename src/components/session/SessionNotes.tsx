"use client";
import { useMemo, useState } from "react";
import { useSessionNotes } from "@/hooks/useSessionNotes";
import { useTranslation } from "@/hooks/useTranslation";

export function SessionNotes({ sessionId }: { sessionId: string }) {
  const { t, locale } = useTranslation();
  const notes = useSessionNotes(sessionId);
  const [draft, setDraft] = useState("");
  const time = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }), [locale]);
  return <section data-testid="session-notes" className="flex min-h-0 flex-1 flex-col gap-4">
    <h2 className="text-lg font-semibold">{t("room.notesHeading")}</h2>
    <p className="text-small text-text-muted">{t("room.notesPrivate")}</p>
    {notes.isPending && <p role="status">{t("community.loading")}</p>}
    {notes.hasNextPage && <button type="button" disabled={notes.isFetchingNextPage} onClick={() => void notes.fetchNextPage()} className="min-h-11 rounded-xl border border-border px-3 text-small">{t("room.olderNotes")}</button>}
    <ol aria-label={t("room.notesHeading")} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
      {notes.notes.map(note => <li key={note.id}><article className="rounded-xl border border-border bg-surface-2 p-3"><p className="whitespace-pre-wrap break-words">{note.body}</p><time dateTime={note.createdAt} className="mt-2 block text-[12px] text-text-muted">{time.format(new Date(note.createdAt))}</time></article></li>)}
    </ol>
    {(notes.isError || notes.mutation.isError) && <p role="alert" className="text-small text-text-muted">{t("community.unavailable")}</p>}
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (!draft.trim() || notes.mutation.isPending) return;
      void notes.mutation.mutateAsync(draft.trim()).then(() => setDraft("")).catch(() => { /* Retain the draft for an idempotent retry. */ });
    }}>
      <label className="block text-small">{t("room.noteLabel")}<textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={3} disabled={notes.mutation.isPending} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-border bg-background p-3 disabled:opacity-60"/></label>
      <button type="submit" disabled={!draft.trim() || notes.mutation.isPending} className="min-h-11 rounded-xl bg-accent px-4 text-background disabled:opacity-50">{t("room.send")}</button>
    </form>
  </section>;
}
