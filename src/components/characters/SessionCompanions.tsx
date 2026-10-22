"use client";

import type { ReactNode } from "react";
import { Users, X, Eye, EyeOff } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslation } from "@/hooks/useTranslation";
import { useSessionCompanions } from "@/hooks/useSessionCompanions";
import {FeatureDrawer} from '@/components/layout/FeatureDrawer';
import {ShareSessionControl} from '@/components/community/ShareSessionControl';
import type { Session } from "@/types/domain";
import { getCharacter } from "@/lib/characters/registry";
import { soloCompanions } from "@/lib/characters/schemas";
import { CharacterCaption } from "./CharacterCaption";
import { CharacterLoop } from "./CharacterLoop";
import { CompanionModePicker } from "./CompanionModePicker";
import { ParticipantGrid, type ParticipantTile } from "@/components/session/ParticipantGrid";

export function SessionCompanions({ session, visible, onOpenChange, leading, sideControls, hidden, onHiddenChange }: { session: Session; visible: boolean; onOpenChange: (open: boolean) => void; leading?: ReactNode; sideControls?: ReactNode; hidden: boolean; onHiddenChange: (hidden: boolean) => void }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const { t } = useTranslation();
  const selection = useSessionCompanions(session.id);
  const companions = selection.isPending && selection.variables ? selection.variables : session.companions ?? soloCompanions();
  const remove = (slug: string) => {
    const characterSlugs = companions.characterSlugs.filter(value => value !== slug);
    selection.mutate({ mode: "characters", characterSlugs });
  };
  const tiles: ParticipantTile[] = [
    ...(leading ? [{ id: "self", content: leading }] : []),
    ...(!hidden ? companions.characterSlugs.map(slug => ({ id: slug, content: <figure className="relative h-full min-h-0 min-w-0">
        <CharacterLoop slug={slug} priority className="h-full !aspect-auto !rounded-lg"/>
        <button type="button" disabled={selection.isPending} tabIndex={visible ? 0 : -1} aria-hidden={!visible} onClick={() => remove(slug)} aria-label={t("characters.remove", { name: t(getCharacter(slug)!.nameKey) })}
          className={`absolute top-1 right-1 z-10 flex size-11 items-center justify-center rounded-xl bg-background/75 text-foreground transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${visible ? "" : "pointer-events-none opacity-0"}`}><X aria-hidden="true" className="size-4"/></button>
        <CharacterCaption slug={slug} sessionId={session.id} cycle={session.companionStatusCycle} visible={visible}/>
      </figure> })) : []),
  ];
  return <>
    {tiles.length > 0 && <ParticipantGrid tiles={tiles} testId="session-companions" controlsVisible={visible} className="absolute top-1 right-1 bottom-[64px] left-[60px]"/>}
    <div data-testid="companion-side-controls" className="absolute top-[156px] bottom-[124px] left-2 z-30 flex w-11 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&>button]:shrink-0">
      {companions.characterSlugs.length > 0 && <button type="button" onClick={() => onHiddenChange(!hidden)} aria-label={t(hidden ? "characters.show" : "characters.hide")} className="flex size-11 items-center justify-center rounded-xl bg-background/40">{hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>}
      <FeatureDrawer title={t('characters.title')} side={desktop?'right':'bottom'} onOpenChange={onOpenChange} trigger={<button type="button" aria-label={t("characters.change")} className="flex size-11 items-center justify-center rounded-xl bg-background/40"><Users className="size-4" /></button>}>
          <div className="mb-5"><ShareSessionControl copyOnly label="sessionSetup.inviteCopy" sessionId={session.id} roomId={session.visibility==='public'?session.roomId??undefined:undefined}/></div>
          <CompanionModePicker allowPeople={false} value={selection.variables && selection.isPending ? selection.variables : companions} onChange={value => selection.mutate(value)} />
          {selection.error && <p role="alert" className="mt-3 text-small">{t("characters.saveError")}</p>}
      </FeatureDrawer>
      {sideControls}
    </div>
  </>;
}
