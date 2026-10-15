"use client";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import type { RoomPreview } from "@/types/dashboard";

export function RoomDirectory({ rooms, available }: { rooms: RoomPreview[]; available: boolean }) {
  const { t } = useTranslation();
  return <section className="mt-6 rounded-2xl border border-border bg-surface/80 p-5" aria-label={t("dashboard.rooms")}>
    <h2 className="text-body font-semibold">{t("dashboard.rooms")}</h2>
    {rooms.length === 0 && <p className="mt-2 text-small text-text-muted">{t(available ? "dashboard.noRooms" : "characters.peopleUnavailable")}</p>}
    <div className="grid gap-3 sm:grid-cols-2">{rooms.map(room => <article key={room.id} className="mt-4 rounded-xl border border-border p-4">
      <h3 className="font-medium">{room.name}</h3><p className="mt-1 text-small text-text-muted">{room.description}</p>
      <p className="mt-2 text-small">{t("dashboard.humansOnline", { count: room.humanCount })}</p>
      {room.canJoin && available && <Link href={`/rooms/${encodeURIComponent(room.id)}`} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-border px-4">{t("dashboard.join")}</Link>}
    </article>)}</div>
  </section>;
}
