"use client";

import Link from "next/link";
import { useStartSession } from "@/hooks/useStartSession";
import { useTranslation } from "@/hooks/useTranslation";
import { soloSceneSchema } from "@/lib/soloScenes/catalog";
import { SoloStudyScene } from "@/components/scene/SoloStudyScene";
import type { CommunityState } from "@/lib/community/schemas";

export function SavedSoloRoom({ state }: { state: CommunityState }) {
  const { t } = useTranslation();
  const start = useStartSession();
  const view = soloSceneSchema.parse(state.context.soloView);
  const room = state.resource!;
  return <section className="relative isolate flex min-h-dvh items-end bg-background p-6">
    <SoloStudyScene preferences={view}/>
    <div className="relative z-10 mx-auto w-full max-w-lg space-y-4 rounded-2xl border border-border bg-background/90 p-6">
      <h1 className="text-title">{room.title}</h1>
      <p className="text-small text-text-muted">{t("room.soloHint")}</p>
      <button disabled={start.isPending} className="min-h-11 w-full rounded-xl bg-accent px-4 text-background" onClick={() => start.mutate({ savedRoomId: room.id, plannedMinutes: null, themeSlug: "rain-desk", task: null })}>{t("home.studyLink")}</button>
      <Link className="inline-flex min-h-11 items-center" href="/">{t("room.backDashboard")}</Link>
      {start.isError && <p role="alert">{t("community.unavailable")}</p>}
    </div>
  </section>;
}
