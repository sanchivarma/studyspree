import type { Locale } from "./locale";
import enStats from "./stats/en.json";
import enComplete from "./complete/en.json";
import deStats from "./stats/de.json";
import deComplete from "./complete/de.json";
import frStats from "./stats/fr.json";
import frComplete from "./complete/fr.json";
import plStats from "./stats/pl.json";
import plComplete from "./complete/pl.json";
import itStats from "./stats/it.json";
import itComplete from "./complete/it.json";

// Pure formatting helpers need four unit labels, not the complete UI catalog.
export const durationMessages = {
  en: { minutes: enStats.stats.durationMinutes, hours: enStats.stats.durationHours, hoursMinutes: enStats.stats.durationHoursMinutes, seconds: enComplete.complete.seconds },
  de: { minutes: deStats.stats.durationMinutes, hours: deStats.stats.durationHours, hoursMinutes: deStats.stats.durationHoursMinutes, seconds: deComplete.complete.seconds },
  fr: { minutes: frStats.stats.durationMinutes, hours: frStats.stats.durationHours, hoursMinutes: frStats.stats.durationHoursMinutes, seconds: frComplete.complete.seconds },
  pl: { minutes: plStats.stats.durationMinutes, hours: plStats.stats.durationHours, hoursMinutes: plStats.stats.durationHoursMinutes, seconds: plComplete.complete.seconds },
  it: { minutes: itStats.stats.durationMinutes, hours: itStats.stats.durationHours, hoursMinutes: itStats.stats.durationHoursMinutes, seconds: itComplete.complete.seconds },
} satisfies Record<Locale, { minutes: string; hours: string; hoursMinutes: string; seconds: string }>;
