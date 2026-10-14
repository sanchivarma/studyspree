import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Profile, Session } from "@/types/domain";

export function comebackDaysAway(session: Session | undefined, today: string, profile: Profile): number | null {
  if (!session?.endedAt || profile.comebackShownForDate === today) return null;
  const days = differenceInCalendarDays(parseISO(today), parseISO(session.localDate));
  return days >= 3 ? days : null;
}
