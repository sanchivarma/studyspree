"use client";
import Link from "next/link";
import type { RoomPreview } from "@/types/dashboard";
import { useTranslation } from "@/hooks/useTranslation";

export function LatestRoomCard({ room }: { room: RoomPreview | null }) {
  const { t } = useTranslation();
  if (!room || !room.canJoin) return null;
  return <Link href={`/rooms/${encodeURIComponent(room.id)}`} className="mt-6 block rounded-2xl border border-border bg-surface p-5">
    <span className="text-small text-text-muted">{t("dashboard.latestRoom")}</span><span className="mt-2 block font-semibold">{room.name}</span>
  </Link>;
}
