"use client";
import { RoomAmbienceControl } from "@/components/ambience/RoomAmbienceControl";
import { SessionSelfCaption } from "@/components/session/SessionSelfCaption";
import { useUpdateRoomControls } from "@/hooks/useUpdateRoomControls";
import { roomControlsSchema, defaultRoomControls } from "@/lib/community/roomControls";
import Link from "next/link";
import { useRoomViewStore } from "@/stores/roomViewStore";
import { InvitationManager } from "@/components/groups/InvitationManager";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Users, X, Grid2X2, Pin, MessageCircle, Video, VideoOff, Settings, MoreHorizontal, ArrowLeft } from "lucide-react";
import { Popover } from "radix-ui";
import { ParticipantGrid, type ParticipantTile } from "@/components/session/ParticipantGrid";
import { CharacterCaption } from "@/components/characters/CharacterCaption";
import { SessionStatusControl } from "@/components/session/SessionStatusControl";
import { CharacterPicker } from "@/components/characters/CharacterPicker";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { SessionProgress } from "@/components/timer/SessionProgress";
import { useCommunity } from "@/hooks/useCommunity";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import { useSessionCompanions } from "@/hooks/useSessionCompanions";
import { useRoomMedia } from "@/hooks/useRoomMedia";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useIdleVisibility } from "@/hooks/useIdleVisibility";
import { usePersonalTile } from "@/hooks/usePersonalTile";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useEndSession } from "@/hooks/useEndSession";
import { useTranslation } from "@/hooks/useTranslation";
import { personSchema } from "@/lib/community/schemas";
import type { CharacterSlug } from "@/types/characters";
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
    return <div className="flex w-full min-w-0 items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[13px] text-text-muted tabular-nums">{t("session.elapsed", { time: formatTimer(elapsedSeconds) })}</p>{remainingSeconds !== null && <p className="text-[11px] text-text-muted tabular-nums">{t("session.remaining", { time })}</p>}<SessionProgress elapsedSeconds={elapsedSeconds} plannedMinutes={session.plannedMinutes}/></div><button className={buttonClass} disabled={isFinishing || finish.isPending} onClick={run}>{t("session.finish")}</button>{finish.isError && <p role="alert">{t("session.finishError")}</p>}</div>;
}
export function RoomScreen({ id }: {
    id: string;
}) {
    const { t,locale } = useTranslation();
    const tile = usePersonalTile();
    const { isVisible: tileChromeVisible } = useIdleVisibility();
    const active = useActiveSession();
    const result = useCommunity("room", { id });
    const state = result.data?.pages[0];
    const joined = state?.context.joined === true;
    const isCreator = state?.resource?.ownerId === state?.viewerId && Boolean(state?.viewerId);
    const isSystem = state?.context.system === true;
    const parsedControls = roomControlsSchema.safeParse(state?.context.controls);
    const controls = parsedControls.success ? parsedControls.data : defaultRoomControls;
    const sharedUpdate = useUpdateRoomControls(id);
    const roster=useRoomPresence(id,joined);
    const quota=z.object({usedSeconds:z.number(),remainingSeconds:z.number().nullable()}).safeParse(state?.context.quota);
    const people = peopleSchema.catch([]).parse(roster.data ? [...new Map(roster.data.pages.flatMap(p=>p.items).map(item=>[item.id,{person:item.person,sharing:item.data.sharing===true,status:String(item.data.status??'')}])).values()] : state?.context.people ?? []).filter(p => p.person);
    const view = useRoomViewStore(s=>s.rooms[id]);
    const pins = view?.pins ?? [];
    const togglePin = useRoomViewStore(s=>s.togglePin);
    const setReason = useRoomViewStore(s=>s.setReason);
    const updateView = useRoomViewStore(s=>s.setView);
    const sharing = people.some(p => p.person!.id === state?.viewerId && p.sharing);
    const pinned = view?.pinned ?? false;
    const setPinned = (value:boolean)=>updateView(id,value);
    const [hiddenPeople, setHiddenPeople] = useState<string[]>([]);
    const [hideVirtual, setHideVirtual] = useState(false);
    const [invite, setInvite] = useState("");
    const [chatOpen, setChatOpen] = useState(false);
    const chatTrigger = useRef<HTMLButtonElement>(null);
    const [goalDraft, setGoalDraft] = useState<string | null>(null);
    const goal = goalDraft ?? active.data?.task ?? "";
    const mutation = useCommunityMutation();
    const media = useRoomMedia(id, joined, sharing);
    const selection=useSessionCompanions(active.data?.id??"");
    const characters = isSystem ? [] : controls.characterSlugs;
    const {join,leave}=useRoomSession(id,joined,controls.themeSlug,characters,goal);
    const choose = (slug: CharacterSlug) => {
      if(!isCreator || isSystem)return;
      const next=characters.includes(slug)?characters.filter(value=>value!==slug):[...characters,slug];
      sharedUpdate.mutate({...controls,characterSlugs:next});
    };
    const shown = orderRoomPeople(people, state?.viewerId ?? "", pins.map(pin => pin.targetId), pinned).filter(p => !hiddenPeople.includes(p.person!.id));
    const sideButton = "flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-foreground/70 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50";
    const changeCharacters = (next: CharacterSlug[]) => { if(isCreator&&!isSystem)sharedUpdate.mutate({...controls,characterSlugs:next}); };
    const tiles: ParticipantTile[] = [
      ...shown.map(p => {
        const person = p.person!, track = media.tracks.get(person.id), pin = pins.find(pin => pin.targetId === person.id);
        const pinLabel = t(person.id === state?.viewerId ? pin ? "calendar.unpinSelf" : "calendar.pinSelf" : pin ? "community.unpin" : "community.pin");
        return { id: `person:${person.id}`, content: <article data-person-id={person.id} className="relative h-full min-h-0 overflow-hidden rounded-lg bg-surface">
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2">{track ? <RoomVideo track={track} mirrored={person.id === state?.viewerId && (tile.data?.mirrored ?? true)}/> : <span className="truncate px-2 text-small">{person.displayName}</span>}</div>
          <button type="button" aria-label={t("characters.hidePerson", { name: person.displayName })} onClick={() => setHiddenPeople(current => [...current, person.id])} tabIndex={tileChromeVisible ? 0 : -1} aria-hidden={!tileChromeVisible} className={`absolute top-0 right-0 z-10 flex size-11 items-center justify-center rounded-lg bg-background/70 transition-opacity duration-200 ${tileChromeVisible ? "" : "pointer-events-none opacity-0"}`}><X aria-hidden="true" className="size-4"/></button>
          <button type="button" aria-label={pinLabel} aria-pressed={Boolean(pin)} disabled={mutation.isPending} onClick={() => togglePin(id,person.id)} tabIndex={tileChromeVisible ? 0 : -1} aria-hidden={!tileChromeVisible} className={`absolute top-0 left-0 z-10 flex size-11 items-center justify-center rounded-lg bg-background/70 transition-opacity duration-200 ${tileChromeVisible ? "" : "pointer-events-none opacity-0"}`}><Pin aria-hidden="true" className={pin ? "size-4 text-accent" : "size-4"}/></button>
          <div aria-hidden={!tileChromeVisible} className={`absolute right-0 bottom-0 left-0 flex items-center gap-1 bg-background/75 pl-2 transition-opacity duration-200 ${tileChromeVisible ? "" : "pointer-events-none opacity-0"}`}>{person.id === state?.viewerId ? <div className="min-w-0 flex-1"><SessionSelfCaption roomId={id} admin={isCreator}/></div> : <p className="min-w-0 flex-1 truncate text-[11px]"><span className="block truncate">{person.username}{person.id === state?.resource?.ownerId && <span className="ml-1 rounded bg-accent/20 px-1 text-[9px] text-accent">{t("room.admin")}</span>}</span><span className="block truncate text-foreground/65">{person.id === state?.viewerId ? tile.data?.status ?? p.status : p.status}</span></p>}
            <Popover.Root><Popover.Trigger asChild><button type="button" aria-label={`${t("characters.tileOptions")} ${person.displayName}`} className="flex size-11 shrink-0 items-center justify-center"><MoreHorizontal aria-hidden="true" className="size-4"/></button></Popover.Trigger><Popover.Portal><Popover.Content onKeyDown={event => event.stopPropagation()} collisionPadding={12} className="z-50 max-h-[70dvh] w-64 overflow-y-auto rounded-xl border border-border bg-surface p-3">
              <p className="break-words text-small">{p.status}</p>
              {isCreator && person.id !== state?.viewerId && <button className={buttonClass} onClick={() => mutation.mutate({ action: "room.kick", data: { id, targetId: person.id } })}>{t("community.remove")}</button>}
              {pin && <label className="block text-small">{t("community.pinReason")}<input maxLength={200} defaultValue={pin.reason} onBlur={event => setReason(id,person.id,event.target.value)} className="min-h-11 w-full rounded-lg bg-background px-3"/></label>}
            </Popover.Content></Popover.Portal></Popover.Root>
          </div>
        </article> };
      }),
      ...(!hideVirtual ? characters.map(slug => ({ id: slug, content: <figure className="relative h-full min-h-0"><CharacterLoop slug={slug} priority className="h-full !aspect-auto !rounded-lg"/><button type="button" disabled={selection.isPending} aria-label={t("characters.remove", { name: t(`characters.${slug}`) })} onClick={() => choose(slug)} tabIndex={tileChromeVisible ? 0 : -1} aria-hidden={!tileChromeVisible} className={`absolute top-0 right-0 flex size-11 items-center justify-center rounded-lg bg-background/70 transition-opacity duration-200 ${tileChromeVisible ? "" : "pointer-events-none opacity-0"}`}><X aria-hidden="true" className="size-4"/></button><CharacterCaption slug={slug} sessionId={active.data?.id ?? id} cycle={active.data?.companionStatusCycle} visible={tileChromeVisible}/></figure> })) : []),
    ];
    const selector = isCreator && !isSystem ? <CharacterPicker selected={characters} onChange={changeCharacters}/> : <p className="text-small text-text-muted">{t(isSystem ? "roomControls.peopleOnly" : "roomControls.creatorOnly")}</p>;
    const options = <div className="space-y-3">
      <p className="text-small text-text-muted">{t("community.sharingNotice")}</p>{isSystem && <><p className="text-small">{t("roomControls.alwaysSilent")}</p><ul className="list-disc space-y-2 pl-5 text-small text-text-muted">{(["privacy1","privacy2","privacy3"] as const).map(key=><li key={key}>{t(`roomControls.${key}`)}</li>)}</ul></>}
      {quota.success && <p className="text-small text-text-muted tabular-nums">{t(quota.data.remainingSeconds === null ? "community.used" : "community.remaining")}: {formatDuration(quota.data.remainingSeconds ?? quota.data.usedSeconds, locale)}</p>}
      {hiddenPeople.length > 0 && <button className={buttonClass} onClick={() => setHiddenPeople([])}>{t("characters.restorePeople")}</button>}
      <button className={buttonClass} onClick={() => mutation.mutate({ action: "room.status", data: { id, body: tile.data?.status ?? "" } })}>{t("personalTile.status")}</button>
      {state?.resource?.data.rules && <p className="whitespace-pre-wrap break-words">{String(state.resource.data.rules)}</p>}
      {isCreator && <InvitationManager id={id} kind="room"/>}
      {isCreator && <button className={buttonClass} onClick={() => mutation.mutate({ action: "room.invite", data: { id, uses: 10, hours: 24 } }, { onSuccess: response => { if (response.token) setInvite(`${window.location.origin}/invite/${response.token}`); } })}>{t("community.invite")}</button>}
      {invite && <label className="block">{t("community.inviteLink")}<input readOnly value={invite} onFocus={event => event.currentTarget.select()} className="block min-h-11 w-full rounded-lg border border-border bg-surface px-3"/></label>}
      {media.unavailable && <p role="status" className="text-small text-text-muted">{t("community.mediaUnavailable")}</p>}
    </div>;
    return <section data-testid="room-screen" className={joined ? "flex h-dvh flex-col gap-1 overflow-hidden bg-background p-1" : "min-h-dvh space-y-3 bg-background p-3"}>
      {!joined && <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-title">{state?.resource?.title ?? t("room.title")}</h1><ShareSessionControl roomId={id}/><Link className={buttonClass} href="/spaces">{t("spaces.title")}</Link></header>}
      {result.isError ? <p role="alert">{t("community.forbidden")}</p> : !state ? <p role="status">{t("community.loading")}</p> : joined ? <>
        <div className="flex min-h-0 flex-1 gap-1">
          <aside data-testid="room-side-controls" className="flex w-[52px] shrink-0 flex-col items-center gap-1 overflow-y-auto py-1 [scrollbar-width:none]">
            <Link href="/spaces" aria-label={t("spaces.title")} className={sideButton}><ArrowLeft aria-hidden="true" className="size-4"/></Link>
            <button type="button" aria-label={t("community.grid")} aria-pressed={!pinned} onClick={() => setPinned(false)} className={sideButton}><Grid2X2 aria-hidden="true" className="size-4"/></button>
            <button type="button" aria-label={t("community.pinned")} aria-pressed={pinned} onClick={() => setPinned(true)} className={sideButton}><Pin aria-hidden="true" className="size-4"/></button>
            <Sheet><SheetTrigger asChild><button type="button" aria-label={t("characters.change")} disabled={!isCreator || isSystem} className={sideButton}><Users aria-hidden="true" className="size-4"/></button></SheetTrigger><SheetContent side="right" showCloseButton={false} onKeyDown={event => event.stopPropagation()} className="overflow-y-auto bg-background p-4"><SheetHeader><SheetTitle>{t("characters.title")}</SheetTitle><SheetDescription>{t("characters.description")}</SheetDescription></SheetHeader><SheetClose asChild><button aria-label={t("scene.close")} className="absolute top-2 right-2 flex size-11 items-center justify-center"><X className="size-4"/></button></SheetClose><div className="mb-4"><ShareSessionControl copyOnly label="sessionSetup.inviteCopy" roomId={id} requiresInvite={state?.resource?.data.private===true}/></div>{selector}</SheetContent></Sheet>
            {characters.length > 0 && <button type="button" aria-label={t(hideVirtual ? "characters.show" : "characters.hide")} onClick={() => setHideVirtual(value => !value)} className={sideButton}>{hideVirtual ? <Eye className="size-4"/> : <EyeOff className="size-4"/>}</button>}
            <button ref={chatTrigger} type="button" aria-label={t("room.chat")} aria-expanded={chatOpen} aria-controls="room-chat" onClick={() => setChatOpen(value => !value)} className={sideButton}><MessageCircle aria-hidden="true" className="size-4"/></button>
            <button type="button" aria-label={t(sharing ? "community.hideCamera" : "community.shareCamera")} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "room.share", data: { id, value: !sharing } })} className={sideButton}>{sharing ? <VideoOff className="size-4"/> : <Video className="size-4"/>}</button>
            <Sheet><SheetTrigger asChild><button type="button" aria-label={t("characters.roomOptions")} className={sideButton}><Settings aria-hidden="true" className="size-4"/></button></SheetTrigger><SheetContent side="right" showCloseButton={false} onKeyDown={event => event.stopPropagation()} className="overflow-y-auto bg-background p-4"><SheetHeader><SheetTitle>{t("characters.roomOptions")}</SheetTitle><SheetDescription>{state.resource?.title ?? t("room.title")}</SheetDescription></SheetHeader><SheetClose asChild><button aria-label={t("scene.close")} className="absolute top-2 right-2 flex size-11 items-center justify-center"><X className="size-4"/></button></SheetClose>{options}</SheetContent></Sheet>
            <RoomAmbienceControl id={id} controls={controls} isCreator={isCreator} locked={isSystem} className={sideButton}/>
            <SessionStatusControl roomId={id}/>
          </aside>
          <ParticipantGrid tiles={tiles} testId="room-video-grid" className="flex-1"/>
        </div>
        <footer className="flex h-[76px] shrink-0 items-center gap-3 pl-[56px] pr-2">{active.data && <RoomTimer session={active.data} leave={leave}/>}<span className="sr-only">{t("community.peopleOnline", { n: people.length })}</span></footer>
      </> : <>
        {options}
        {active.data && <Link className={buttonClass} href={`/session/${active.data.id}`}>{t("characters.characters")}</Link>}
        <div className="max-w-xl space-y-2"><label className="block text-small">{t("room.goal")}<input value={goal} onChange={event => setGoalDraft(event.target.value)} maxLength={500} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-surface px-3"/></label><p className="text-small text-text-muted">{t("room.goalNotice")}</p><button className={buttonClass} disabled={join.isPending} onClick={() => join.mutate()}>{t("community.join")}</button></div>
        {selector}
      </>}
      {(mutation.isError || join.isError || selection.isError || sharedUpdate.isError) && <p role="alert">{t("community.unavailable")}</p>}
      {joined && chatOpen && <RoomChat roomId={id} onClose={() => setChatOpen(false)} onRestoreFocus={() => chatTrigger.current?.focus()}/>}
    </section>;
}
