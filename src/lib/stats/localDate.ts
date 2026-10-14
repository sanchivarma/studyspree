import { formatInTimeZone } from "date-fns-tz";

/** Bucket an instant in the profile's explicit timezone, never the host timezone. */
export function toLocalDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}
