"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharacter } from "@/lib/characters/registry";
import { characterSessionStatus } from "@/lib/characters/sessionStatus";
import type { CharacterSlug } from "@/types/characters";

export function CharacterCaption({ slug, sessionId, cycle, visible = true }: { slug: CharacterSlug; sessionId: string; cycle?: number; visible?: boolean }) {
  const { t } = useTranslation();
  const character = getCharacter(slug)!;
  const status = t(characterSessionStatus(sessionId, slug, cycle));
  return <figcaption aria-hidden={!visible} data-testid={`character-caption-${slug}`} className={`absolute right-1 bottom-1 left-1 rounded bg-background/80 px-2 py-1 text-center text-[11px] text-foreground/80 transition-opacity duration-200 motion-reduce:transition-none ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
    <p className="truncate">{t(character.nameKey)} · {t("characters.virtualLabel")}</p>
    <p data-testid={`character-status-${slug}`} className="truncate text-foreground/65" title={status}>{status}</p>
  </figcaption>;
}
