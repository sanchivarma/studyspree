import type { Locale } from "@/translations";
import { durationMessages } from "@/translations/units";
import { formatDuration, numberFormatter } from "@/lib/stats/presentation";

export function formatTimer(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  if (value >= 3600) return `${Math.floor(value / 3600)}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function formatBankedDuration(seconds: number, locale: Locale): string {
  return seconds < 60 ? (durationMessages[locale] ?? durationMessages.en).seconds.replace("{count}", numberFormatter(locale).format(seconds)) : formatDuration(seconds, locale);
}
