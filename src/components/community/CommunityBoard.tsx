"use client";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { z } from "zod";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { CommunityError } from "@/lib/repo/community";
import type { CommunityArea, CommunityQuery } from "@/lib/community/schemas";
import { personSchema } from "@/lib/community/schemas";
import { CommunityComposer, buttonClass } from "./CommunityComposer";
import { CommunityCard } from "./CommunityCard";
import { AccountControls } from "@/components/layout/AccountControls";
import { formatDuration, formatDate } from "@/lib/stats/presentation";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import { shiftDate } from "@/lib/stats/dates";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { TranslationKey } from "@/translations";
const pageTitle = (area: CommunityArea): TranslationKey => area === "awards" ? "achievements.title" : area === "recipients" ? "conversations.title" : `${area}.title`;
const errorKeys = z.enum(["accountRequired", "full", "limit", "forbidden", "invalid", "unavailable", "transferFirst", "inviteUnavailable", "invalidMedia"]);
export function CommunityBoard({ area, id, groupId, embedded = false }: {
    area: CommunityArea;
    id?: string;
    groupId?: string;
    embedded?: boolean;
}) {
    const { t, locale } = useTranslation();
    const profile = useProfile();
    const auth = useAuth();
    const mutation = useCommunityMutation();
    const [search, setSearch] = useState("");
    const term = useDeferredValue(search);
    const [filter, setFilter] = useState(area === "feed" ? "following" : "all");
    const [metric, setMetric] = useState<"time" | "streak">("time");
    const [period, setPeriod] = useState<"week" | "all">("week");
    const [weekOffset, setWeekOffset] = useState(0);
    const zone = profile.data?.timezone ?? "UTC";
    const today = toLocalDate(now(), zone);
    const weekDay = Number(formatInTimeZone(now(), zone, "i"));
    const weekStart = shiftDate(today, 1 - weekDay + weekOffset * 7);
    const weekEnd = shiftDate(weekStart, 7);
    const query: CommunityQuery = { ...(id ? { id } : {}), ...(groupId ? { groupId } : {}), ...(term ? { q: term } : {}), filter,
        ...(area === "leaderboards" ? { metric, period } : {}), ...(area === "schedule" ? { from: fromZonedTime(`${weekStart}T00:00`, zone).toISOString(), to: fromZonedTime(`${weekEnd}T00:00`, zone).toISOString() } : {}), };
    const result = useCommunity(area, query);
    const state = result.data?.pages[0];
    const entries = [...new Map(result.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()];
    const items = area === "messages" ? entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) : entries;
    const context = state?.context ?? {};
    const error = result.error instanceof CommunityError ? errorKeys.catch("unavailable").parse(result.error.code) : "unavailable";
    const members = z.array(z.object({ person: personSchema.nullable(), role: z.enum(["owner", "moderator", "member"]), accepted: z.boolean() })).safeParse(context.members ?? []);
    const content = <>
  {!embedded && <><AccountControls /><h1 className="text-title">{state?.resource?.title || t(pageTitle(area))}</h1></>}
  {result.isError ? <div role="alert" className="rounded-2xl border border-border bg-surface p-5"><p>{t(`community.${error}`)}</p>{area==="groups"&&id&&error==="forbidden"&&<button className={buttonClass} onClick={()=>mutation.mutate({action:"group.join",data:{id}})}>{t(mutation.isSuccess?"community.pending":"community.join")}</button>}{error === "accountRequired" && <button className={`${buttonClass} mt-3`} onClick={() => void auth.execute("logout")}>{t("community.signin")}</button>}</div> : <>
   {!["plans", "preferences", "messages", "room", "awards"].includes(area) && <label className="block"><span className="sr-only">{t("community.search")}</span><input type="search" aria-label={t("community.search")} placeholder={t("community.search")} value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-surface px-4"/></label>}
   {state && <>
    {area === "groups" && id && <section className="space-y-3 rounded-2xl border border-border bg-surface p-5"><p className="whitespace-pre-wrap break-words">{state.resource?.body}</p><div className="flex flex-wrap gap-2">
     {context.joined !== true ? <button className={buttonClass} onClick={() => mutation.mutate({ action: "group.join", data: { id } })}>{t("community.join")}</button> : <><button className={buttonClass} onClick={() => mutation.mutate({ action: "group.leave", data: { id } })}>{t("community.remove")}</button>{typeof context.threadId === "string" && <Link href={`/conversations/${context.threadId}`} className={buttonClass}>{t("conversations.title")}</Link>}<Link href={`/schedule?group=${id}`} className={buttonClass}>{t("schedule.title")}</Link></>}
    </div>{members.success && <ul className="space-y-3">{members.data.filter(member => member.person).map(member => <li key={member.person!.id} className="flex flex-wrap items-center gap-2 border-t border-border pt-3"><span className="mr-auto">{member.person!.displayName} · {t(`community.${member.role}`)}{!member.accepted && ` · ${t("community.pending")}`}</span>{context.manager === true && member.person!.id !== state.viewerId && <>
     {!member.accepted && <button className={buttonClass} onClick={() => mutation.mutate({ action: "group.approve", data: { id, targetId: member.person!.id } })}>{t("community.approve")}</button>}
     {member.role === "member" && <button className={buttonClass} onClick={() => mutation.mutate({ action: "group.remove", data: { id, targetId: member.person!.id } })}>{t("community.remove")}</button>}
     {state.resource?.ownerId === state.viewerId && member.accepted && <><button className={buttonClass} onClick={() => mutation.mutate({ action: "group.role", data: { id, targetId: member.person!.id, role: member.role === "moderator" ? "member" : "moderator" } })}>{t(member.role === "moderator" ? "community.member" : "community.moderator")}</button><button className={buttonClass} onClick={() => mutation.mutate({ action: "group.transfer", data: { id, targetId: member.person!.id } })}>{t("community.transfer")}</button></>}
    </>}</li>)}</ul>}</section>}
    {area === "groups" && id && context.joined === true && <CommunityBoard area="feed" groupId={id} embedded/>}
    {area === "plans" && <section className="space-y-4 rounded-2xl border border-border bg-surface p-6"><h2 className="text-xl">{context.plan==="free"?t("community.free"):String(context.plan ?? "")}</h2><p>{t("community.used")}: <span className="tabular-nums">{formatDuration(Number(context.usedSeconds ?? 0), locale)}</span></p><p>{context.dailyLimitSeconds === null ? t("community.unconfigured") : `${t("community.remaining")}: ${formatDuration(Number(context.remainingSeconds ?? 0), locale)}`}</p><p className="text-small text-text-muted">{t("community.noCheckout")}</p><Link href="/study?mode=characters" className={buttonClass}>{t("characters.characters")}</Link></section>}
    {area === "preferences" && <section className="rounded-2xl border border-border bg-surface p-5"><label className="flex min-h-14 items-center justify-between gap-3">{t("community.allowMessages")}<input type="checkbox" disabled={mutation.isPending} checked={context.allowMessages === true} onChange={event => mutation.mutate({ action: "preferences", data: { allowMessages: event.target.checked } })}/></label>{z.array(z.object({ id: z.uuid() })).catch([]).parse(context.blocks ?? []).map(block => <button key={block.id} className={buttonClass} onClick={() => mutation.mutate({ action: "block.set", data: { targetId: block.id, value: false } })}>{t("community.unblock")}</button>)}</section>}
    {area === "notifications" && <button className={buttonClass} onClick={() => mutation.mutate({ action: "notification.read", data: {} })}>{t("community.readAll")} ({String(context.unread ?? 0)})</button>}
    {area === "leaderboards" && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" disabled={mutation.isPending} checked={context.optedIn === true} onChange={event => mutation.mutate({ action: "preferences", data: { leaderboardOptIn: event.target.checked } })}/>{t("community.optIn")}</label>}
    {area === "messages" && state.resource && <h2 className="text-lg font-semibold">{state.resource.data.kind === "direct" ? t("community.conversation") : state.resource.title}</h2>}
    {area === "feed" && id && state.resource && <CommunityCard area="feed" item={state.resource} viewerId={state.viewerId} timezone={zone}/>}
    {(area !== "groups" || !id) && <CommunityComposer area={area} id={id} groupId={groupId??(typeof state.resource?.data.groupId==="string"?state.resource.data.groupId:undefined)} canPost={context.canPost !== false}/>}
   </>}
   {(["spaces", "groups", "feed", "partners", "messages"] as CommunityArea[]).includes(area) && !(area === "groups" && id) && <div className="flex flex-wrap gap-2">{(area === "spaces" ? ["all", "pomodoro", "deep", "chill", "cram"] : area === "groups" ? ["all", "mine"] : area === "feed" ? ["following", "popular", "saved"] : area === "partners" ? ["all", "favorites"] : ["all", "saved"]).map(value => <button key={value} type="button" className={buttonClass} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(`community.${value}` as TranslationKey)}</button>)}</div>}
   {area === "leaderboards" && <div className="flex flex-wrap gap-3"><select aria-label={t("community.category")} value={metric} onChange={event => {setMetric(event.target.value === "streak" ? "streak" : "time");if(event.target.value==="streak")setPeriod("all");}} className={buttonClass}><option value="time">{t("community.studyTime")}</option><option value="streak">{t("community.bestStreak")}</option></select>{metric==="time"&&<select aria-label={t("community.date")} value={period} onChange={event => setPeriod(event.target.value === "all" ? "all" : "week")} className={buttonClass}><option value="week">{t("community.week")}</option><option value="all">{t("community.allTime")}</option></select>}</div>}
   {area === "schedule" && <div className="flex flex-wrap items-center justify-between gap-3"><button className={buttonClass} onClick={() => setWeekOffset(value => value - 1)}>{t("community.previous")}</button><span>{formatDate(weekStart, locale)} – {formatDate(shiftDate(weekEnd, -1), locale)} · {zone}</span><button className={buttonClass} onClick={() => setWeekOffset(value => value + 1)}>{t("community.next")}</button></div>}
   {result.isPending ? <p role="status">{t("community.loading")}</p> : items.length === 0 && !(area === "groups" && id) && !["plans", "preferences"].includes(area) ? <p className="text-text-muted">{t("community.empty")}</p> : null}
   {area === "leaderboards" && items.length > 0 ? <div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full text-left"><thead><tr><th className="p-4">{t("community.rank")}</th><th className="p-4">{t("community.member")}</th><th className="p-4">{t(metric === "time" ? "community.studyTime" : "community.bestStreak")}</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-border"><td className="p-4 tabular-nums">{String(item.data.rank)}</td><td className="p-4">{item.title}</td><td className="p-4 tabular-nums">{metric === "time" ? formatDuration(Number(item.data.score), locale) : String(item.data.score)}</td></tr>)}</tbody></table></div> : area === "schedule" ? <div className="overflow-x-auto"><div className="grid min-w-[1050px] grid-cols-7 gap-3">{Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i)).map(day => <div key={day} className="space-y-3"><h2 className="text-small font-semibold">{formatDate(day, locale)}</h2>{items.filter(item => toLocalDate(new Date(String(item.data.startsAt)), zone) === day).map(item => <CommunityCard key={item.id} area={area} item={item} viewerId={state?.viewerId ?? ""} timezone={zone}/>)}</div>)}</div></div> : !(area === "groups" && id) && <div className={area === "messages" ? "space-y-3" : "grid gap-4 md:grid-cols-2"}>{items.map(item => <CommunityCard key={item.id} area={area} item={item} viewerId={state?.viewerId ?? ""} timezone={zone}/>)}</div>}
   {result.hasNextPage && <button type="button" className={buttonClass} disabled={result.isFetchingNextPage} onClick={() => void result.fetchNextPage()}>{t("community.loadMore")}</button>}
   {mutation.isError && <p role="alert">{t(`community.${mutation.error instanceof CommunityError ? errorKeys.catch("unavailable").parse(mutation.error.code) : "unavailable"}`)}</p>}
  </>}
 </>;
    return embedded ? <section className="space-y-5">{content}</section> : <section data-testid={`community-${area}`} className="mx-auto max-w-6xl space-y-6 px-5 pt-24 pb-10 md:px-8">{content}</section>;
}
