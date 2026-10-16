"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated attachments use a no-store route. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { attachmentSchema, type CommunityArea, type CommunityItem, type CommunityCommand } from "@/lib/community/schemas";
import { z } from "zod";
import { buttonClass, fieldClass, CommunityComposer } from "./CommunityComposer";
import { formatDuration } from "@/lib/stats/presentation";
import { now } from "@/lib/clock";
import { useState } from "react";
export function CommunityCard({ area, item, viewerId, timezone }: {
    area: CommunityArea;
    item: CommunityItem;
    viewerId: string;
    timezone: string;
}) {
    const { t, locale } = useTranslation();
    const mutation = useCommunityMutation();
    const router = useRouter();
    const [reply, setReply] = useState(false);
    const data = item.data;
    const own = item.ownerId === viewerId;
    const run = (command: CommunityCommand) => mutation.mutate(command);
    const attachments = z.array(attachmentSchema).safeParse(data.attachments ?? []);
    const title = area === "notifications" ? t(`community.${z.enum(["follow", "message", "booking", "cancelled", "membership", "partner"]).catch("message").parse(item.title)}`)
        : area === "conversations" && data.kind === "direct" ? t("community.conversation")
            : area === "conversations" && ["general", "announcements", "contact-and-guidelines", "feature-requests"].includes(item.title) ? t(`community.${item.title as "general" | "announcements" | "contact-and-guidelines" | "feature-requests"}`) : item.title;
    return <article id={`item-${item.id}`} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
  {item.person && <Link href={`/people/${item.person.username}`} className="inline-flex min-h-11 items-center text-small text-accent">{item.person.displayName}</Link>}
  {title && <h2 className="break-words text-lg font-semibold">{title}</h2>}
  {item.body && <p className="whitespace-pre-wrap break-words">{item.body}</p>}
  {data.removed === true && <p className="text-text-muted">{t("community.removed")}</p>}
  {attachments.success && attachments.data.map(file => file.mime.startsWith("image/") ? <img key={file.path} src={`/api/community-media/${file.path}`} alt={file.name} loading="lazy" className="max-h-96 w-full rounded-xl object-contain"/> : file.mime.startsWith("audio/") ? <audio key={file.path} controls preload="none" src={`/api/community-media/${file.path}`} className="w-full"/> : <a key={file.path} href={`/api/community-media/${file.path}`} download className="inline-flex min-h-11 items-center text-accent underline">{t("community.download")}: {file.name}</a>)}
  {area === "tasks" && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={data.done === true} disabled={mutation.isPending} onChange={event => run({ action: "task.update", data: { id: item.id, done: event.target.checked } })} className="size-5 accent-accent"/>{t("community.done")}</label>}
  {area === "spaces" && <><p className="text-small text-text-muted">{t("community.peopleOnline", { n: Number(data.online ?? 0) })} · {t("community.capacity")}: {String(data.capacity)}</p><Link href={`/rooms/${item.id}`} className={buttonClass}>{t("community.open")}</Link></>}
  {area === "groups" && <><p className="text-small text-text-muted">{t("community.members")}: {String(data.members ?? 0)}</p><Link href={`/groups/${item.id}`} className={buttonClass}>{t("community.open")}</Link>{data.joined !== true && <button disabled={mutation.isPending} onClick={() => run({ action: "group.join", data: { id: item.id } })} className={buttonClass}>{t("community.join")}</button>}</>}
  {area === "buddies" && <><p className="text-small text-text-muted">{Array.isArray(data.subjects) ? data.subjects.join(" · ") : ""}</p>{!own && item.ownerId && <button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "thread.direct", data: { targetId: item.ownerId! } }, { onSuccess: result => router.push(`/conversations/${result.id}`) })}>{t("community.message")}</button>}{own && <button className={buttonClass} disabled={mutation.isPending} onClick={() => run({ action: "buddy.remove", data: {} })}>{t("community.remove")}</button>}</>}
  {area === "conversations" && <Link href={`/conversations/${item.id}`} className={buttonClass}>{t("community.open")}</Link>}
  {area === "search" && typeof data.href === "string" && /^\/(people|rooms|groups|buddies)(\/|$)/.test(data.href) && <Link href={data.href} className={buttonClass}>{t("community.open")}</Link>}
  {area === "notifications" && <button className={buttonClass} disabled={data.read === true || mutation.isPending} onClick={() => run({ action: "notification.read", data: { id: item.id } })}>{t("community.read")}</button>}
  {area === "partners" && <><p className="tabular-nums">{t("community.secondsTogether", { n: formatDuration(Number(data.seconds ?? 0), locale) })} · {t("community.daysTogether", { n: Number(data.days ?? 0) })}</p><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={data.favorite === true} onChange={event => run({ action: "partner.set", data: { targetId: item.id, favorite: event.target.checked, notify: data.notify === true } })}/>{t("community.favorites")}</label><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={data.notify === true} onChange={event => run({ action: "partner.set", data: { targetId: item.id, favorite: data.favorite === true, notify: event.target.checked } })}/>{t("community.notify")}</label></>}
  {area === "schedule" && <><p className="tabular-nums">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(String(data.startsAt)))} · {String(data.minutes)} {t("community.minutes")}</p><p className="text-small text-text-muted">{String(data.bookings)} / {String(data.capacity)}</p>{data.cancelled === true ? <p>{t("community.cancelled")}</p> : <div className="flex flex-wrap gap-2">
   <button className={buttonClass} disabled={mutation.isPending || own} onClick={() => run({ action: data.booked === true ? "event.unbook" : "event.book", data: { id: item.id } })}>{t(data.booked === true ? "community.unbook" : "community.book")}</button>
   {own && <button className={buttonClass} onClick={() => run({ action: "event.cancel", data: { id: item.id } })}>{t("community.cancelEvent")}</button>}
   {data.booked === true && now().getTime() >= Date.parse(String(data.startsAt)) && now().getTime() < Date.parse(String(data.startsAt)) + Number(data.minutes) * 60000 && <Link href={`/rooms/${String(data.roomId)}`} className={buttonClass}>{t("community.join")}</Link>}
  </div>}</>}
  {(area === "feed" || area === "messages") && <div className="flex flex-wrap gap-2">
   <button className={buttonClass} onClick={() => run({ action: area === "feed" ? "post.save" : "message.save", data: { id: item.id, value: data.saved !== true } })} disabled={mutation.isPending}>{t(data.saved === true ? "community.unsave" : "community.saveItem")}</button>
   {area === "feed" && <><Link className={buttonClass} href={`/feed/${item.id}`}>{t("community.replies", { n: Number(data.replies ?? 0) })}</Link>{(["heart", "support", "celebrate"] as const).map((emoji, index) => <button key={emoji} className={buttonClass} aria-label={`${t("community.react")} ${["♥", "☘", "🎉"][index]}`} aria-pressed={data.reaction === emoji} onClick={() => run({ action: "post.react", data: { id: item.id, emoji: data.reaction === emoji ? null : emoji } })}>{["♥", "☘", "🎉"][index]}</button>)}<span className="self-center tabular-nums">{String(data.reactions ?? 0)}</span></>}
   {area === "messages" && data.removed !== true && <button className={buttonClass} onClick={() => setReply(value => !value)}>{t("community.reply")}</button>}
  </div>}
  {reply && area === "messages" && <CommunityComposer area="messages" id={String(data.threadId)} parentId={item.id}/>}
  {own && ["feed", "messages"].includes(area) && data.removed !== true && <details><summary className="min-h-11 cursor-pointer text-small text-accent">{t("community.edit")}</summary><form onSubmit={event => { event.preventDefault(); run({ action: area === "feed" ? "post.edit" : "message.edit", data: { id: item.id, body: String(new FormData(event.currentTarget).get("body") ?? "") } }); }}><textarea name="body" aria-label={t("community.body")} defaultValue={item.body} required maxLength={4000} className={fieldClass}/><button className={buttonClass}>{t("community.save")}</button></form></details>}
  {own && ["groups", "spaces", "buddies"].includes(area) && <details><summary className="min-h-11 cursor-pointer text-small text-accent">{t("community.edit")}</summary><form className="space-y-3" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get("title") ?? ""); const body = String(form.get("body") ?? ""); if (area === "groups")
        run({ action: "group.update", data: { id: item.id, title, body } });
    else if (area === "spaces")
        run({ action: "room.update", data: { id: item.id, title, body, capacity: Number(form.get("capacity")) } });
    else
        run({ action: "buddy.save", data: { title, body, subjects: Array.isArray(data.subjects) ? data.subjects.map(String) : [], published: data.published === true } }); }}><label className="block">{t("community.title")}<input name="title" defaultValue={item.title} required maxLength={100} className={fieldClass}/></label><label className="block">{t("community.body")}<textarea name="body" defaultValue={item.body} maxLength={area === "groups" ? 2000 : area === "spaces" ? 1000 : 4000} className={fieldClass}/></label>{area === "spaces" && <label className="block">{t("community.capacity")}<input name="capacity" type="number" min={1} max={1000} defaultValue={Number(data.capacity)} required className={fieldClass}/></label>}<button className={buttonClass}>{t("community.save")}</button></form></details>}
  {own && ["tasks", "feed", "messages"].includes(area) && <button className={buttonClass} disabled={mutation.isPending} onClick={() => run({ action: area === "tasks" ? "task.delete" : area === "feed" ? "post.remove" : "message.remove", data: { id: item.id } })}>{t("community.remove")}</button>}
  {!own && item.ownerId && ["feed", "messages", "buddies", "groups", "spaces"].includes(area) && <details><summary className="min-h-11 cursor-pointer text-small text-text-muted">{t("community.report")}</summary><form onSubmit={event => { event.preventDefault(); run({ action: "report.create", data: { kind: area === "feed" ? "post" : area === "messages" ? "message" : area === "buddies" ? "buddy" : area === "groups" ? "group" : "room", targetId: item.id, reason: String(new FormData(event.currentTarget).get("reason") ?? "") } }); }}><label>{t("community.reason")}<input name="reason" required maxLength={1000} className={fieldClass}/></label><button className={buttonClass}>{t("community.report")}</button></form><button className={buttonClass} onClick={() => run({ action: "block.set", data: { targetId: item.ownerId!, value: true } })}>{t("community.block")}</button></details>}
  {mutation.isError && <p role="alert">{t("community.unavailable")}</p>}
 </article>;
}
