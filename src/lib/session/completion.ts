import type { Session } from "@/types/domain";
import type { TranslationKey } from "@/translations";

export function isRecentCompletion(session: Session, timestamp: number): boolean {
  if (!session.endedAt) return false;
  const age = timestamp - new Date(session.endedAt).getTime();
  return age >= 0 && age < 600_000;
}
export function affirmationKey(actualSeconds: number): TranslationKey {
  if (actualSeconds < 300) return "complete.affirmationStarted";
  if (actualSeconds < 900) return "complete.affirmationWork";
  if (actualSeconds < 2700) return "complete.affirmation";
  return "complete.affirmationLong";
}
