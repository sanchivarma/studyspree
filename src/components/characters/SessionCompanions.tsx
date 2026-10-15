"use client";

import { useState } from "react";
import { Users, X, Eye, EyeOff } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslation } from "@/hooks/useTranslation";
import { useSessionCompanions } from "@/hooks/useSessionCompanions";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import type { Session } from "@/types/domain";
import { getCharacter } from "@/lib/characters/registry";
import { soloCompanions } from "@/lib/characters/schemas";
import { CharacterLoop } from "./CharacterLoop";
import { CompanionModePicker } from "./CompanionModePicker";

export function SessionCompanions({ session, visible, onOpenChange }: { session: Session; visible: boolean; onOpenChange: (open: boolean) => void }) {
  const [hidden, setHidden] = useState(false);
  const desktop = useMediaQuery("(min-width: 768px)");
  const { t } = useTranslation();
  const selection = useSessionCompanions(session.id);
  const companions = session.companions ?? soloCompanions();
  return <>
    {!hidden && companions.characterSlugs.length > 0 && <div data-testid="session-companions" className="absolute inset-x-4 top-[35%] mx-auto grid max-h-[42dvh] max-w-4xl grid-cols-2 gap-3 overflow-y-auto md:grid-cols-4">
      {companions.characterSlugs.map(slug => <figure key={slug} className="min-w-0">
        <CharacterLoop slug={slug} priority />
        <figcaption className="mt-1 truncate text-center text-[11px] text-foreground/70">{t(getCharacter(slug)!.nameKey)} · {t("characters.virtualLabel")}</figcaption>
      </figure>)}
    </div>}
    <div className={visible ? "absolute top-64 left-1/2 z-10 flex -translate-x-1/2 flex-col gap-1 sm:flex-row" : "hidden"}>
      {companions.characterSlugs.length > 0 && <button type="button" onClick={() => setHidden(value => !value)} aria-label={t(hidden ? "characters.show" : "characters.hide")} className="flex size-11 items-center justify-center rounded-xl bg-background/40">{hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>}
      <Sheet onOpenChange={onOpenChange}><SheetTrigger asChild><button type="button" aria-label={t("characters.change")} className="flex size-11 items-center justify-center rounded-xl bg-background/40"><Users className="size-4" /></button></SheetTrigger>
        <SheetContent side={desktop ? "right" : "bottom"} showCloseButton={false} className="max-h-[90dvh] overflow-y-auto bg-background p-5">
          <SheetHeader className="mb-5 p-0 pr-11"><SheetTitle>{t("characters.title")}</SheetTitle><SheetDescription>{t("characters.description")}</SheetDescription></SheetHeader>
          <SheetClose asChild><button type="button" aria-label={t("scene.close")} className="absolute top-2 right-2 flex size-11 items-center justify-center"><X className="size-5" /></button></SheetClose>
          <CompanionModePicker value={selection.variables && selection.isPending ? selection.variables : companions} onChange={value => selection.mutate(value)} />
          {selection.error && <p role="alert" className="mt-3 text-small">{t("characters.saveError")}</p>}
        </SheetContent>
      </Sheet>
    </div>
  </>;
}
