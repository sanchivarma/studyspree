import { sessionNoteSchema, sessionNotesPageSchema, type NoteCursor } from "@/lib/sessionNotes/schemas";
import type { z } from "zod";
let local: Promise<import("./localSessionNotes").LocalSessionNotes> | undefined;
const account = () => Boolean(document.querySelector('[data-repository-mode="server"]'));
const preview = () => local ??= import("./localSessionNotes").then(module => new module.LocalSessionNotes()).catch((error: unknown) => { local = undefined; throw error; });
async function request<T>(body: object, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/session-notes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store", body: JSON.stringify(body), signal });
  if (!response.ok) throw new Error("Notes unavailable");
  return schema.parse(await response.json());
}
export const sessionNotesRepository = {
  async read(sessionId: string, cursor: NoteCursor | null, signal?: AbortSignal) {
    return account() ? request({ operation: "read", sessionId, cursor }, sessionNotesPageSchema, signal) : (await preview()).read(sessionId, cursor);
  },
  async add(sessionId: string, body: string, clientId: string) {
    return account() ? request({ operation: "add", sessionId, body, clientId }, sessionNoteSchema) : (await preview()).add(sessionId, body, clientId);
  },
};
