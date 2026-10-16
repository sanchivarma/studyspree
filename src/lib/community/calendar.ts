import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
/** A repeated DST hour must be selected explicitly; nonexistent times are rejected. */
export function resolveCalendarTime(wallTime: string, timezone: string, occurrence: "earlier" | "later" = "earlier"): string {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wallTime))
        throw new Error("Invalid time");
    const guess = fromZonedTime(wallTime, timezone).getTime();
    const candidates = Array.from({length:25},(_,index)=>guess+(index-12)*900000).filter(value => formatInTimeZone(new Date(value), timezone, "yyyy-MM-dd'T'HH:mm") === wallTime).sort((a, b) => a - b);
    if (!candidates.length)
        throw new Error("Nonexistent local time");
    return new Date(occurrence === "later" ? candidates.at(-1)! : candidates[0]).toISOString();
}
