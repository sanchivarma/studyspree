import type { Session } from "./domain";
import type { CompanionMode } from "./characters";

export type SessionHistoryQuery = { from?: string; to?: string; companionMode?: CompanionMode; cursor?: string; limit: number };
export type SessionHistoryPage = { items: Session[]; nextCursor: string | null };
export type StatsRange = { from: string; to: string };
