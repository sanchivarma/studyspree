import { z } from "zod";
export const sessionNoteSchema = z.object({
  id: z.uuid(), sessionId: z.string().min(1), body: z.string().trim().min(1).max(2000),
  createdAt: z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString()),
}).strict();
export const noteCursorSchema = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() }).strict();
export const sessionNotesPageSchema = z.object({ items: z.array(sessionNoteSchema), nextCursor: noteCursorSchema.nullable() }).strict();
export const sessionNoteRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("read"), sessionId: z.uuid(), cursor: noteCursorSchema.nullable().optional() }).strict(),
  z.object({ operation: z.literal("add"), sessionId: z.uuid(), body: z.string().trim().min(1).max(2000), clientId: z.uuid() }).strict(),
]);
export type SessionNote = z.infer<typeof sessionNoteSchema>;
export type NoteCursor = z.infer<typeof noteCursorSchema>;
export type SessionNotesPage = z.infer<typeof sessionNotesPageSchema>;
