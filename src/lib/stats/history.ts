import { z } from "zod";
import type { Session } from "@/types/domain";
import type { SessionHistoryPage, SessionHistoryQuery } from "@/types/stats";

export const historyQuerySchema = z.object({
  from: z.iso.date().optional(), to: z.iso.date().optional(),
  companionMode: z.enum(["solo", "characters", "people", "mixed"]).optional(),
  cursor: z.string().max(2048).optional(), limit: z.number().int().min(1).max(100),
}).strict().refine(value => !value.from || !value.to || value.from <= value.to, { message: "Invalid date range" });
const cursorSchema = z.object({ startedAt: z.iso.datetime(), id: z.string().min(1), filters: z.string() }).strict();
const descending = (a: string, b: string) => a === b ? 0 : a > b ? -1 : 1;

export function paginateHistory(sessions: readonly Session[], query: SessionHistoryQuery): SessionHistoryPage {
  const input = historyQuerySchema.parse(query);
  const filters = JSON.stringify([input.from ?? null, input.to ?? null, input.companionMode ?? null]);
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (input.cursor) {
    try { cursor = cursorSchema.parse(JSON.parse(decodeURIComponent(input.cursor))); } catch { throw new Error("Invalid history cursor"); }
    if (cursor.filters !== filters) throw new Error("History cursor does not match the filters");
  }
  const entries = sessions.filter(session => session.endedAt !== null
    && (!input.from || session.localDate >= input.from) && (!input.to || session.localDate <= input.to)
    && (!input.companionMode || session.companions.mode === input.companionMode)
    && (!cursor || session.startedAt < cursor.startedAt || (session.startedAt === cursor.startedAt && session.id < cursor.id)))
    .sort((a, b) => descending(a.startedAt, b.startedAt) || descending(a.id, b.id));
  const items = entries.slice(0, input.limit);
  const last = items.at(-1);
  return { items, nextCursor: entries.length > items.length && last ? encodeURIComponent(JSON.stringify({ startedAt: last.startedAt, id: last.id, filters })) : null };
}
