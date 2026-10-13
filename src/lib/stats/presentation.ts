import { translate, type Locale } from "@/translations";

export function formatDuration(seconds: number, locale: Locale): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const number = new Intl.NumberFormat(locale);
  if (hours === 0) return translate(locale, "stats.durationMinutes", { minutes: number.format(minutes) });
  if (minutes === 0) return translate(locale, "stats.durationHours", { hours: number.format(hours) });
  return translate(locale, "stats.durationHoursMinutes", { hours: number.format(hours), minutes: number.format(minutes) });
}

export function formatDate(date: string, locale: Locale, includeYear = false): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", ...(includeYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
