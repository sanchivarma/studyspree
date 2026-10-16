import { addDays, addMonths, format, parseISO, startOfWeek } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export function monthWindow(month: string, timezone: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  const first = parseISO(`${month}-01`);
  const start = startOfWeek(first, { weekStartsOn: 1 });
  const dates = Array.from({ length: 42 }, (_, index) => format(addDays(start, index), "yyyy-MM-dd"));
  return {
    dates,
    from: fromZonedTime(`${dates[0]}T00:00:00`, timezone).toISOString(),
    to: fromZonedTime(`${format(addDays(start, 42), "yyyy-MM-dd")}T00:00:00`, timezone).toISOString(),
  };
}

export function shiftMonth(month: string, offset: number) {
  return format(addMonths(parseISO(`${month}-01`), offset), "yyyy-MM");
}

/** End is exclusive: an event ending at midnight does not occupy the next day. */
export function eventOccupiesDate(startsAt: string, endsAt: string, date: string, timezone: string) {
  return formatInTimeZone(new Date(startsAt), timezone, "yyyy-MM-dd") <= date
    && formatInTimeZone(new Date(new Date(endsAt).getTime() - 1), timezone, "yyyy-MM-dd") >= date;
}
