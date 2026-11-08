"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCommunityMutation } from "@/hooks/useCommunityMutation";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { defaultRoomControls } from "@/lib/community/roomControls";
import { defaultSoloScene, deskSlugs, windowSlugs } from "@/lib/soloScenes/catalog";
import { getTheme } from "@/lib/themes/registry";
import type { CharacterSlug } from "@/types/characters";
import type { SoloScenePreferences } from "@/lib/soloScenes/catalog";

const CharacterPicker = dynamic(() => import("@/components/characters/CharacterPicker").then(module => module.CharacterPicker));
const kinds = ["temporary", "permanent-solo", "permanent-shared"] as const;
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3";

export function RoomCreationSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile();
  const mutation = useCommunityMutation();
  const [kind, setKind] = useState<typeof kinds[number]>("temporary");
  const [characters, setCharacters] = useState<CharacterSlug[]>([]);
  const [view, setView] = useState<SoloScenePreferences | null>(null);
  const selectedView = view ?? profile.data?.soloScene ?? defaultSoloScene;
  return <Sheet open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}>
    <SheetContent side="right" showCloseButton={false} className="w-full overflow-y-auto bg-background p-5 sm:max-w-xl">
      <SheetHeader className="pr-11"><SheetTitle>{t("room.create")}</SheetTitle><SheetDescription>{t("room.createDescription")}</SheetDescription></SheetHeader>
      <button type="button" disabled={mutation.isPending} aria-label={t("scene.close")} onClick={onClose} className="absolute top-2 right-2 flex size-11 items-center justify-center"><X aria-hidden="true" className="size-5"/></button>
      <form className="mt-5 space-y-5" onSubmit={event => {
        event.preventDefault();
        if (mutation.isPending) return;
        const form = new FormData(event.currentTarget);
        mutation.mutate({ action: "room.create", data: {
          title: String(form.get("name") ?? "").trim(), body: "", category: "deep", private: kind === "permanent-solo", capacity: 60,
          roomKind: kind, soloView: selectedView,
          controls: { ...defaultRoomControls, themeSlug: getTheme(profile.data?.selectedTheme ?? "rain-desk").slug, characterSlugs: kind === "permanent-solo" ? [] : characters },
        } }, { onSuccess: room => { onClose(); router.push(`/rooms/${room.id}`); } });
      }}>
        <fieldset disabled={mutation.isPending} className="space-y-5">
          <label className="block text-small">{t("room.name")}<input name="name" required maxLength={100} autoFocus className={field}/></label>
          <fieldset><legend className="text-small font-medium">{t("room.lifetime")}</legend>
            {kinds.map(value => <label key={value} className="flex min-h-11 items-center gap-3"><input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)}/>{t(value === "temporary" ? "room.temporary" : value === "permanent-solo" ? "room.permanentSolo" : "room.permanentShared")}</label>)}
          </fieldset>
          <p className="text-small text-text-muted">{t(kind === "temporary" ? "room.temporaryHint" : kind === "permanent-solo" ? "room.soloHint" : "room.sharedHint")}</p>
          {kind === "permanent-solo" ? <>
            <label className="block text-small">{t("soloScene.desk")}<select className={field} value={selectedView.desk} onChange={event => setView({ ...selectedView, desk: event.target.value as SoloScenePreferences["desk"] })}>
              <option value="none">{t("room.noDesk")}</option>{deskSlugs.map(slug => <option key={slug} value={slug}>{t(`soloScene.desk-${slug}`)}</option>)}
            </select></label>
            <label className="block text-small">{t("soloScene.window")}<select className={field} value={selectedView.window} onChange={event => setView({ ...selectedView, window: event.target.value as SoloScenePreferences["window"] })}>
              {windowSlugs.map(slug => <option key={slug} value={slug}>{t(`soloScene.window-${slug}`)}</option>)}
            </select></label>
          </> : <CharacterPicker selected={characters} onChange={setCharacters}/>}
          <button type="submit" className="min-h-11 w-full rounded-xl bg-accent px-4 font-semibold text-background">{t(mutation.isPending ? "room.creating" : "room.create")}</button>
        </fieldset>
        {mutation.isError && <p role="alert">{t("community.unavailable")}</p>}
      </form>
    </SheetContent>
  </Sheet>;
}
