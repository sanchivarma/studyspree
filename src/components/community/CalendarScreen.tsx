"use client";
import Link from "next/link";
import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { useProfile } from "@/hooks/useProfile";
import { useDayStats } from "@/hooks/useDayStats";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useTranslation } from "@/hooks/useTranslation";
import { now } from "@/lib/clock";
import { monthWindow, shiftMonth, eventOccupiesDate } from "@/lib/community/month";
import { resolveCalendarTime } from "@/lib/community/calendar";
import { formatDuration } from "@/lib/stats/presentation";
import { cn } from "@/lib/utils";
import { ContactSelection } from "./ContactSelection";
import { buttonClass } from "./CommunityComposer";

const eventSchema = z.object({ startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), roomId: z.uuid(), response: z.enum(["host", "accepted", "pending", "declined", "public"]), cancelled: z.boolean() });

export function CalendarScreen() {
  const { t, locale } = useTranslation();
  const profile = useProfile();
  const zone = profile.data?.timezone ?? "UTC";
  const today = formatInTimeZone(now(), zone, "yyyy-MM-dd");
  const [offset, setOffset] = useState(0);
  const month = shiftMonth(today.slice(0, 7), offset);
  const window = monthWindow(month, zone);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDate = selected && window.dates.includes(selected) ? selected : month === today.slice(0, 7) ? today : `${month}-01`;
  const history = useSessionHistory({ from: selectedDate, to: selectedDate });
  const stats = useDayStats(window.dates[0], window.dates[41]);
  const query = useCommunity("calendar", { from: window.from, to: window.to }, !profile.isPending);
  const mutation = useCommunityMutation();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [occurrence, setOccurrence] = useState<"earlier" | "later">("earlier");
  const [contacts, setContacts] = useState<string[]>([]);
  const [lists, setLists] = useState<string[]>([]);
  const [invalid, setInvalid] = useState(false);
  const [saved, setSaved] = useState(false);
  const records = query.data?.pages.flatMap(page => page.items) ?? [];
  const events = records.flatMap(item => { const parsed = eventSchema.safeParse(item.data); return parsed.success ? [{ ...item, event: parsed.data }] : []; });
  const dayEvents = events.filter(item => eventOccupiesDate(item.event.startsAt, item.event.endsAt, selectedDate, zone));
  const dayStat = stats.data?.find(day => day.date === selectedDate);
  const monthSeconds = stats.data?.filter(day => day.date.startsWith(month)).reduce((sum, day) => sum + day.totalSeconds, 0) ?? 0;
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const dateLabel = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const eventTime = (date: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(new Date(date));
  return <section className="mx-auto max-w-7xl space-y-5 p-3 md:p-6" data-testid="calendar-screen">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-title">{t("calendar.title")}</h1><p className="text-small text-text-muted">{zone} · {t("calendar.monthReading", { time: formatDuration(monthSeconds, locale) })}</p></div><Link className={buttonClass} href="/contacts">{t("contacts.title")}</Link></header>
    <div className="flex items-center justify-between gap-2"><button className={buttonClass} aria-label={t("calendar.previous")} onClick={() => setOffset(value => value - 1)}><ChevronLeft aria-hidden="true"/></button><h2 className="text-subtitle capitalize">{monthLabel}</h2><div className="flex gap-2"><button className={buttonClass} onClick={() => { setOffset(0); setSelected(today); }}>{t("calendar.today")}</button><button className={buttonClass} aria-label={t("calendar.next")} onClick={() => setOffset(value => value + 1)}><ChevronRight aria-hidden="true"/></button></div></div>
    <p className="flex gap-4 text-small"><span className="text-accent">● {t("calendar.reading")}</span><span>▰ {t("calendar.scheduled")}</span></p>
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border" aria-label={monthLabel}>
      {Array.from({ length: 7 }, (_, index) => <div key={index} className="bg-surface py-2 text-center text-small">{weekday.format(new Date(`2026-01-${String(5 + index).padStart(2, "0")}T12:00:00Z`))}</div>)}
      {window.dates.map(date => {
        const reading = stats.data?.find(day => day.date === date)?.totalSeconds ?? 0;
        const scheduled = events.filter(item => !item.event.cancelled && item.event.response !== "declined" && eventOccupiesDate(item.event.startsAt, item.event.endsAt, date, zone));
        return <button key={date} data-testid={`calendar-day-${date}`} aria-pressed={date === selectedDate} aria-label={`${dateLabel(date)}; ${t("calendar.reading")}: ${formatDuration(reading, locale)}; ${t("calendar.sessions", { n: scheduled.length })}`} onClick={() => setSelected(date)} className={cn("flex min-h-24 min-w-0 flex-col gap-1 bg-surface p-1 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent sm:min-h-32 sm:p-2", date === selectedDate && "bg-surface-2 ring-2 ring-inset ring-accent", !date.startsWith(month) && "text-text-muted")}>
          <span className={cn("w-fit rounded-full px-1.5 text-small tabular-nums", date === today && "bg-accent text-background")}>{Number(date.slice(8))}</span>
          {reading > 0 && <span className="truncate text-[10px] text-accent sm:text-small">{formatDuration(reading, locale)}</span>}
          <span aria-hidden="true" className="mt-auto h-1 rounded-full bg-grey-zero"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, reading / 7200 * 100)}%` }}/></span>
          {scheduled.length > 0 && <span className="truncate rounded bg-foreground/10 px-1 text-[10px] sm:text-small">{scheduled.length} <span className="hidden sm:inline">{scheduled[0].title}</span></span>}
        </button>;
      })}
    </div>
    {query.hasNextPage && <button className={buttonClass} onClick={() => void query.fetchNextPage()}>{t("community.loadMore")}</button>}
    {query.isPending && <p role="status">{t("community.loading")}</p>}
    {(query.isError || stats.isError) && <p role="alert">{t("community.accountRequired")}</p>}
    <section className="space-y-3" aria-label={dateLabel(selectedDate)}><h2 className="text-subtitle">{dateLabel(selectedDate)}</h2><p>{t("calendar.reading")}: <span className="tabular-nums">{formatDuration(dayStat?.totalSeconds ?? 0, locale)}</span></p>
      <ul className="space-y-2">{history.data?.pages.flatMap(page => page.items).map(session => <li key={session.id} className="rounded-xl border border-border p-3"><p className="font-semibold">{session.task ?? t("session.label")}</p><p className="text-small text-text-muted">{eventTime(session.startedAt)} · {formatDuration(session.actualSeconds, locale)}</p></li>)}</ul>
      {history.hasNextPage && <button className={buttonClass} onClick={() => void history.fetchNextPage()}>{t("community.loadMore")}</button>}
      {dayEvents.map(item => <article key={item.id} className="space-y-2 rounded-xl border border-border bg-surface p-4"><h3 className="font-semibold">{item.title}</h3><p className="text-small">{eventTime(item.event.startsAt)} — {eventTime(item.event.endsAt)}</p><p className="break-all text-small text-text-muted">{t("calendar.sessionId")}: {item.event.roomId}</p>
        {item.event.cancelled ? <p>{t("community.cancelled")}</p> : <div className="flex flex-wrap gap-2">
          <Link className={buttonClass} href={`/rooms/${item.event.roomId}`}>{t("calendar.openSession")}</Link>
          {(item.event.response === "pending" || item.event.response === "declined") && <button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "calendar.respond", data: { id: item.id, accept: true } })}>{t("contacts.accept")}</button>}
          {item.event.response === "accepted" || item.event.response === "pending" ? <button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "calendar.respond", data: { id: item.id, accept: false } })}>{t("calendar.decline")}</button> : null}
          {item.event.response === "host" && <button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "event.cancel", data: { id: item.id } })}>{t("community.cancelEvent")}</button>}
        </div>}
        <label className="block text-small">{t("calendar.shareLink")}<input readOnly value={typeof globalThis.location === "undefined" ? "" : `${globalThis.location.origin}/rooms/${item.event.roomId}`} onFocus={event => event.currentTarget.select()} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3"/></label>
      </article>)}
    </section>
    <form className="space-y-4 rounded-2xl border border-border bg-surface p-4" onSubmit={event => {
      event.preventDefault(); setInvalid(false); setSaved(false);
      try {
        const startsAt = resolveCalendarTime(start, zone, occurrence);
        const endsAt = resolveCalendarTime(end, zone, occurrence);
        if (new Date(startsAt) <= now() || new Date(endsAt) <= new Date(startsAt) || new Date(endsAt).getTime() - new Date(startsAt).getTime() > 31 * 86400000) { setInvalid(true); return; }
        mutation.mutate({ action: "calendar.create", data: { title, startsAt, endsAt, contacts, lists } }, { onSuccess: () => { setSaved(true); setTitle(""); setSelected(start.slice(0, 10)); setOffset((Number(start.slice(0, 4)) - Number(today.slice(0, 4))) * 12 + Number(start.slice(5, 7)) - Number(today.slice(5, 7))); } });
      } catch { setInvalid(true); }
    }}>
      <h2 className="text-subtitle">{t("calendar.create")}</h2>
      <label className="block">{t("community.title")}<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3"/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label>{t("community.startsAt")}<input type="datetime-local" required value={start} onChange={event => setStart(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3"/></label><label>{t("calendar.endsAt")}<input type="datetime-local" required value={end} onChange={event => setEnd(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3"/></label></div>
      <label className="block">{t("community.dstChoice")}<select value={occurrence} onChange={event => setOccurrence(event.target.value as "earlier" | "later")} className="ml-3 min-h-11 rounded-xl bg-background px-3"><option value="earlier">{t("community.earlier")}</option><option value="later">{t("community.later")}</option></select></label>
      <ContactSelection contacts={contacts} lists={lists} onContacts={setContacts} onLists={setLists}/>
      <button className={buttonClass} disabled={mutation.isPending}>{t("calendar.create")}</button>
      {invalid && <p role="alert">{t("calendar.invalidDates")}</p>}{mutation.isError && <p role="alert">{t("community.unavailable")}</p>}{saved && <p role="status">{t("calendar.saved")}</p>}
    </form>
  </section>;
}
