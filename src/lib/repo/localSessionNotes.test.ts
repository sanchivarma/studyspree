import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LocalSessionNotes } from "./localSessionNotes";

const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const nonce = "00000000-0000-4000-8000-000000000003";
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
beforeEach(() => {
  values.clear(); vi.stubGlobal("navigator", {});
  storage.setItem("ss_sessions", JSON.stringify([{ id: first, endedAt: null }, { id: second, endedAt: null }]));
});
afterEach(() => vi.unstubAllGlobals());

it("persists a trimmed private note across repository recreation and deduplicates retries", async () => {
  const repo = new LocalSessionNotes(() => storage);
  const note = await repo.add(first, "  Read chapter three  ", nonce);
  expect(note.body).toBe("Read chapter three");
  expect(await repo.add(first, note.body, nonce)).toEqual(note);
  expect((await new LocalSessionNotes(() => storage).read(first, null)).items).toEqual([note]);
  expect(Object.keys(note)).not.toContain("clientId");
  await expect(repo.add(first, "Different note", nonce)).rejects.toThrow("retry differs");
});

it("keeps notebooks separate and rejects writes after Finish without deleting saved notes", async () => {
  const repo = new LocalSessionNotes(() => storage);
  const note = await repo.add(first, "Private reminder", nonce);
  expect((await repo.read(second, null)).items).toEqual([]);
  storage.setItem("ss_sessions", JSON.stringify([{ id: first, endedAt: "2026-10-21T12:00:00Z" }]));
  await expect(repo.add(first, "After Finish", second)).rejects.toThrow("Session unavailable");
  expect((await repo.read(first, null)).items).toEqual([note]);
  expect(await repo.add(first, "Private reminder", nonce)).toEqual(note);
});

it("rejects empty, oversized and malformed note writes", async () => {
  const repo = new LocalSessionNotes(() => storage);
  await expect(repo.add(first, " ", nonce)).rejects.toThrow();
  await expect(repo.add(first, "x".repeat(2001), nonce)).rejects.toThrow();
  await expect(repo.add(first, "Valid text", "invalid nonce")).rejects.toThrow();
  expect((await repo.read(first, null)).items).toEqual([]);
});

it("pages earlier notes with tied timestamps without dropping or repeating a note", async () => {
  const entries = Array.from({ length: 52 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, clientId: crypto.randomUUID(),
    sessionId: first, body: `Note ${index}`, createdAt: "2026-10-21T12:00:00.000Z",
  }));
  storage.setItem(`ss_session_notes_${first}`, JSON.stringify(entries));
  const repo = new LocalSessionNotes(() => storage);
  const page = await repo.read(first, null);
  const earlier = await repo.read(first, page.nextCursor);
  expect(page.items).toHaveLength(50); expect(earlier.items).toHaveLength(2);
  expect(page.items[0].body).toBe("Note 51");
  expect(new Set([...page.items, ...earlier.items].map(note => note.id)).size).toBe(52);
  expect(earlier.nextCursor).toBeNull();
});
