import { formatInTimeZone } from "date-fns-tz";

export function toLocalDate(date: Date | string, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}
