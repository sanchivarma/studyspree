import { z } from "zod";
import { now } from "@/lib/clock";
import { sessionNoteSchema, type SessionNote, type SessionNotesPage, type NoteCursor } from "@/lib/sessionNotes/schemas";

const savedNoteSchema = sessionNoteSchema.extend({ clientId: z.uuid() });
type SavedNote = z.infer<typeof savedNoteSchema>;
const sessionsSchema = z.array(z.object({ id: z.string(), endedAt: z.string().nullable() }));
export class LocalSessionNotes {
  private memory = new Map<string, string>();
  constructor(private storage: () => Pick<Storage, "getItem" | "setItem"> | null = () => window.localStorage) {}
  private raw(key: string) {
    try { return this.storage()?.getItem(key) ?? this.memory.get(key) ?? null; }
    catch { return this.memory.get(key) ?? null; }
  }
  private entries(sessionId: string) {
    return z.array(savedNoteSchema).parse(JSON.parse(this.raw(`ss_session_notes_${sessionId}`) ?? "[]"));
  }
  async read(sessionId: string, cursor: NoteCursor | null): Promise<SessionNotesPage> {
    const notes = this.entries(sessionId).filter(note => !cursor || note.createdAt < cursor.at || (note.createdAt === cursor.at && note.id < cursor.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const items = notes.slice(0, 50).map(note => sessionNoteSchema.strip().parse(note));
    const last = items.at(-1);
    return { items, nextCursor: notes.length > 50 && last ? { at: last.createdAt, id: last.id } : null };
  }
  async add(sessionId: string, body: string, clientId: string): Promise<SessionNote> {
    const write = () => {
      const notes = this.entries(sessionId);
      const existing = notes.find(note => note.clientId === clientId);
      if (existing) {
        if (existing.body !== body.trim()) throw new Error("Note retry differs");
        return sessionNoteSchema.strip().parse(existing);
      }
      const sessions = sessionsSchema.parse(JSON.parse(this.raw("ss_sessions") ?? "[]"));
      if (!sessions.some(session => session.id === sessionId && session.endedAt === null)) throw new Error("Session unavailable");
      const note: SavedNote = savedNoteSchema.parse({ id: crypto.randomUUID(), sessionId, body, clientId, createdAt: now().toISOString() });
      const key = `ss_session_notes_${sessionId}`, value = JSON.stringify([...notes, note]);
      this.memory.set(key, value);
      try { this.storage()?.setItem(key, value); } catch { /* Notes remain available for this open preview. */ }
      return sessionNoteSchema.strip().parse(note);
    };
    return navigator.locks ? navigator.locks.request(`ss_session_notes_${sessionId}`, write) : write();
  }
}
