"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useRecentSession } from "@/hooks/useRecentSession";
import { useTotalSeconds } from "@/hooks/useTotalSeconds";
import { comebackDaysAway } from "@/lib/session/comeback";
import { now } from "@/lib/clock";
import { toLocalDate } from "@/lib/stats/localDate";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";

type Offer = { date: string; daysAway: number; totalSeconds: number };

export function useComeback(enabled: boolean) {
  const profile = useProfile();
  const recent = useRecentSession();
  const total = useTotalSeconds();
  const client = useQueryClient();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [dismissedDate, setDismissedDate] = useState<string | null>(null);
  const markedDate = useRef<string | null>(null);
  const today = profile.data ? toLocalDate(now(), profile.data.timezone) : null;
  const daysAway = profile.data && today ? comebackDaysAway(recent.data?.[0], today, profile.data) : null;
  // Latch the presentation before persisting its display event. Updating the
  // profile marker must not dismiss a screen the user is currently reading.
  if (enabled && today && daysAway !== null && total.data !== undefined && offer?.date !== today && dismissedDate !== today) {
    setOffer({ date: today, daysAway, totalSeconds: total.data });
  }
  const { mutate: markShown } = useMutation({
    mutationFn: (date: string) => repo.updateProfile({ comebackShownForDate: date }),
    onSuccess: value => client.setQueryData(queryKeys.profile(), value),
  });
  const visible = enabled && offer?.date === today && dismissedDate !== today ? offer : null;
  useEffect(() => {
    if (!visible || markedDate.current === visible.date) return;
    markedDate.current = visible.date;
    console.debug("comeback_shown", { days_away: visible.daysAway });
    markShown(visible.date);
  }, [visible, markShown]);
  return { offer: visible, dismiss: () => setDismissedDate(today) };
}
