import type { Locale } from "@/translations/locale";
import { durationMessages } from "@/translations/units";

const numbers = new Map<Locale, Intl.NumberFormat>();
const dates = new Map<string, Intl.DateTimeFormat>();
export function numberFormatter(locale: Locale): Intl.NumberFormat {
  let formatter = numbers.get(locale);
  if (!formatter) { formatter = new Intl.NumberFormat(locale); numbers.set(locale, formatter); }
  return formatter;
}

export function formatDuration(seconds: number, locale: Locale): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const number = numberFormatter(locale);
  const messages = durationMessages[locale] ?? durationMessages.en;
  if (hours === 0) return messages.minutes.replace("{minutes}", number.format(minutes));
  if (minutes === 0) return messages.hours.replace("{hours}", number.format(hours));
  return messages.hoursMinutes.replace("{hours}", number.format(hours)).replace("{minutes}", number.format(minutes));
}

export function formatDate(date: string, locale: Locale, includeYear = false): string {
  const key = `${locale}:${includeYear}`;
  let formatter = dates.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "long", ...(includeYear ? { year: "numeric" } : {}), timeZone: "UTC" });
    dates.set(key, formatter);
  }
  return formatter.format(new Date(`${date}T00:00:00Z`));
}
