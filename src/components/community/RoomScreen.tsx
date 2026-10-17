"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { z } from "zod";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useSessionCompanions } from "@/hooks/useSessionCompanions";
import { useRoomMedia } from "@/hooks/useRoomMedia";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useProfile } from "@/hooks/useProfile";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useEndSession } from "@/hooks/useEndSession";
import { useTranslation } from "@/hooks/useTranslation";
import { personSchema } from "@/lib/community/schemas";
import { characterSlugs, type CharacterSlug } from "@/types/characters";
import type { Session } from "@/types/domain";
import { CharacterLoop } from "@/components/characters/CharacterLoop";
import { RoomVideo } from "./RoomVideo";
import { buttonClass } from "./CommunityComposer";
import { formatTimer } from "@/lib/session/presentation";
import { useSessionTitle } from "@/hooks/useSessionTitle";
import { formatDuration } from "@/lib/stats/presentation";
import { ShareSessionControl } from "./ShareSessionControl";
import { orderRoomPeople } from "@/lib/community/roomGrid";
import { RoomChat } from "./RoomChat";
const peopleSchema = z.array(z.object({ person: personSchema.nullable(), sharing: z.boolean(), status: z.string() }));
const pinsSchema = z.array(z.object({ targetId: z.uuid(), reason: z.string() }));
function RoomTimer({ session, leave }: {
    session: Session;
    leave: () => Promise<void>;
}) {
    const { elapsedSeconds, remainingSeconds, isFinishing } = useSessionTimer(session);
    const finish = useEndSession();
    const { t } = useTranslation();
    const time = formatTimer(remainingSeconds ?? elapsedSeconds);
    useSessionTitle(time);
    const ending=useRef(false);
    const run=()=>{if(isFinishing||finish.isPending||ending.current)return;ending.current=true;void leave().catch(()=>{});finish.mutate({id:session.id,reason:remainingSeconds!==null&&remainingSeconds<=0?"completed":"stopped_early"},{onError:()=>{ending.current=false;}});};
    const handler = useRef(run);
    handler.current = run;
    useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented)
        handler.current(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
    return <div className="flex items-center gap-4"><span className="tabular-nums">{time}</span><button className={buttonClass} disabled={isFinishing || finish.isPending} onClick={run}>{t("session.finish")}</button>{finish.isError && <p role="alert">{t("session.finishError")}</p>}</div>;
}
export function RoomScreen({ id }: {
    id: string;
}) {
    const { t,locale } = useTranslation();
    const profile = useProfile();
    const tile = usePersonalTile();
    const active = useActiveSession();
    const result = useCommunity("room", { id });
    const state = result.data?.pages[0];
    const joined = state?.context.joined === true;
    const quota=z.object({usedSeconds:z.number(),remainingSeconds:z.number().nullable()}).safeParse(state?.context.quota);
    const people = peopleSchema.catch([]).parse(state?.context.people ?? []).filter(p => p.person);
    const pins = pinsSchema.catch([]).parse(state?.context.pins ?? []);
    const sharing = people.some(p => p.person!.id === state?.viewerId && p.sharing);
    const [pinned, setPinned] = useState(false);
    const [page, setPage] = useState(0);
    const [prejoinCharacters, setPrejoinCharacters] = useState<CharacterSlug[]>([]);
    const [invite, setInvite] = useState("");
    const [chatOpen, setChatOpen] = useState(false);
    const chatTrigger = useRef<HTMLButtonElement>(null);
    const [goalDraft, setGoalDraft] = useState<string | null>(null);
    const goal = goalDraft ?? active.data?.task ?? "";
    const mutation = useCommunityMutation();
    const media = useRoomMedia(id, joined, sharing);
    const selection=useSessionCompanions(active.data?.id??"");
    const characters = joined && active.data
        ? (selection.isPending && selection.variables ? selection.variables.characterSlugs : active.data.companions.characterSlugs)
        : prejoinCharacters;
    const {join,leave}=useRoomSession(id,joined,profile.data?.selectedTheme??"rain-desk",characters,goal);
    const choose = (slug: CharacterSlug) => {
        if (!characters.includes(slug) && characters.length >= 8) return;
        const next = characters.includes(slug) ? characters.filter(s => s !== slug) : [...characters, slug];
        if (active.data && joined)
            selection.mutate({ mode: next.length ? "mixed" : "people", characterSlugs: next });
        else setPrejoinCharacters(next);
    };
    const shown = orderRoomPeople(people, state?.viewerId ?? "", pins.map(pin => pin.targetId), pinned);
    const tileCount = Math.min(12, shown.length) + characters.length;
    const gridStyle = { "--room-columns": tileCount <= 1 ? 1 : tileCount <= 4 ? 2 : 3 } as CSSProperties;
    return <section data-testid="room-screen" className="flex min-h-dvh flex-col gap-2 bg-background p-1 md:h-dvh md:overflow-hidden md:p-2">
    <header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-title">{state?.resource?.title ?? t("room.title")}</h1>{joined && active.data && <RoomTimer session={active.data} leave={leave}/>}<ShareSessionControl roomId={id}/><Link className={buttonClass} href="/spaces">{t("spaces.title")}</Link></header>
    {result.isError ? <p role="alert">{t("community.forbidden")}</p> : !state ? <p role="status">{t("community.loading")}</p> : <>
      <p className="max-w-3xl text-small text-text-muted">{t("community.sharingNotice")}</p>
      {quota.success&&<p className="text-small text-text-muted tabular-nums">{t(quota.data.remainingSeconds===null?"community.used":"community.remaining")}: {formatDuration(quota.data.remainingSeconds??quota.data.usedSeconds,locale)}</p>}
      {!joined&&active.data&&<Link className={buttonClass} href={`/session/${active.data.id}`}>{t("characters.characters")}</Link>}
      {!joined ? <div className="max-w-xl space-y-2"><label className="block text-small">{t("room.goal")}<input value={goal} onChange={event => setGoalDraft(event.target.value)} maxLength={500} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-surface px-3"/></label><p className="text-small text-text-muted">{t("room.goalNotice")}</p><button className={buttonClass} disabled={join.isPending} onClick={() => join.mutate()}>{t("community.join")}</button></div> : <>
        <div className="flex flex-wrap gap-3"><button className={buttonClass} aria-pressed={!pinned} onClick={() => { setPinned(false); setPage(0); }}>{t("community.grid")}</button><button className={buttonClass} aria-pressed={pinned} onClick={() => { setPinned(true); setPage(0); }}>{t("community.pinned")}</button>
          <button ref={chatTrigger} type="button" className={buttonClass} aria-expanded={chatOpen} aria-controls="room-chat" onClick={() => setChatOpen(open => !open)}>{t("room.chat")}</button>
          <button className={buttonClass} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "room.share", data: { id, value: !sharing } })}>{t(sharing ? "community.hideCamera" : "community.shareCamera")}</button>
          <button className={buttonClass} onClick={() => mutation.mutate({ action: "room.status", data: { id, body: tile.data?.status ?? "" } })}>{t("personalTile.status")}</button>
          {state.context.manager === true && <button className={buttonClass} onClick={() => mutation.mutate({ action: "room.invite", data: { id, uses: 10, hours: 24 } }, { onSuccess: response => { if (response.token)
                    setInvite(`${window.location.origin}/invite/${response.token}`); } })}>{t("community.invite")}</button>}
        </div>
        {invite && <label className="block">{t("community.inviteLink")}<input readOnly value={invite} onFocus={e => e.currentTarget.select()} className="block min-h-11 w-full rounded-lg border border-border bg-surface px-3"/></label>}
        {media.unavailable && <p role="status" className="text-small text-text-muted">{t("community.mediaUnavailable")}</p>}
        <p>{t("community.peopleOnline", { n: people.length })}</p>
        <div data-testid="room-video-grid" style={gridStyle} className="grid min-h-[50dvh] md:min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-1 sm:grid-cols-[repeat(var(--room-columns),minmax(0,1fr))]">{shown.slice(page * 12, page * 12 + 12).map(p => { const person = p.person!; const track = media.tracks.get(person.id); const pin = pins.find(pin => pin.targetId === person.id); return <article key={person.id} data-person-id={person.id} className="relative min-h-48 md:min-h-0 overflow-hidden rounded-lg bg-surface"><div className="absolute inset-0 flex items-center justify-center bg-surface-2">{track ? <RoomVideo track={track} mirrored={person.id === state.viewerId && (tile.data?.mirrored ?? true)}/> : <span className="text-xl">{person.displayName}</span>}</div><div className="absolute right-1 bottom-1 left-1 space-y-1 rounded-lg bg-background/75 p-2"><p className="font-semibold">{person.displayName}</p><p className="break-words text-small">{p.status}</p><button className={buttonClass} aria-pressed={Boolean(pin)} onClick={() => mutation.mutate({ action: "room.pin", data: { id, targetId: person.id, value: !pin } })}>{t(person.id === state.viewerId ? pin ? "calendar.unpinSelf" : "calendar.pinSelf" : pin ? "community.unpin" : "community.pin")}</button>{state.context.manager===true && person.id!==state.viewerId && <button className={buttonClass} onClick={()=>mutation.mutate({action:"room.kick",data:{id,targetId:person.id}})}>{t("community.remove")}</button>}{pin && <label className="block text-small">{t("community.pinReason")}<input maxLength={200} defaultValue={pin.reason} onBlur={event => mutation.mutate({ action: "room.pin", data: { id, targetId: person.id, value: true, reason: event.target.value } })} className="min-h-11 w-full rounded-lg bg-background px-3"/></label>}</div></article>; })}{characters.map(slug => <CharacterLoop key={slug} slug={slug} priority className="h-full min-h-48 md:min-h-0 !aspect-auto !rounded-lg"/>)}</div>
        {shown.length > 12 && <div className="flex gap-4"><button className={buttonClass} disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t("community.previousPage")}</button><span className="tabular-nums">{page + 1} / {Math.ceil(shown.length / 12)}</span><button className={buttonClass} disabled={(page + 1) * 12 >= shown.length} onClick={() => setPage(p => p + 1)}>{t("community.nextPage")}</button></div>}
      </>}
      <details className="shrink-0 rounded-xl border border-border p-2" open={!joined}><summary className="min-h-11 cursor-pointer py-2">{t("characters.characters")}</summary><fieldset><legend className="sr-only">{t("characters.characters")}</legend><div className="flex flex-wrap gap-3">{characterSlugs.map(slug => <label key={slug} className="flex min-h-11 items-center gap-2"><input type="checkbox" aria-label={t(`characters.${slug}`)} disabled={!characters.includes(slug) && characters.length >= 8} checked={characters.includes(slug)} onChange={() => choose(slug)}/>{t(`characters.${slug}`)}</label>)}</div></fieldset></details>
    </>}
    {(mutation.isError || join.isError) && <p role="alert">{t("community.unavailable")}</p>}
    {joined && chatOpen && <RoomChat roomId={id} onClose={() => { setChatOpen(false); chatTrigger.current?.focus(); }}/>}
  </section>;
}
