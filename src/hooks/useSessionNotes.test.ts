import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, useMutation } from "@tanstack/react-query";
import type { SessionNote } from "@/lib/sessionNotes/schemas";
import { queryKeys } from "@/lib/queryKeys";
import { clearClientSelections } from "@/lib/session/clearClientSelections";
import { useSessionNotes } from "./useSessionNotes";

const hooks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useRef: (current: unknown) => ({ current }) }));
vi.mock("@tanstack/react-query", async original => ({
  ...await original<typeof import("@tanstack/react-query")>(),
  useQueryClient: hooks.client,
  useInfiniteQuery: vi.fn(() => ({ data: undefined })),
  useMutation: vi.fn(() => ({})),
}));
vi.mock("@/lib/repo/sessionNotes", () => ({ sessionNotesRepository: { read: vi.fn(), add: vi.fn() } }));

const id = "00000000-0000-4000-8000-000000000001";
const note: SessionNote = { id: "00000000-0000-4000-8000-000000000002", sessionId: id, body: "Remember chapter three", createdAt: "2026-10-22T10:00:00.000Z" };
let cache: QueryClient;
function savedResponse() {
  return (vi.mocked(useMutation).mock.calls.at(-1)![0] as { onSuccess: (note: SessionNote) => void }).onSuccess;
}
beforeEach(() => {
  vi.clearAllMocks();
  cache = new QueryClient();
  hooks.client.mockReturnValue(cache);
  cache.setQueryData(queryKeys.activeSession(), { id, endedAt: null });
});
afterEach(() => cache.clear());

it("shows the saved note immediately while the same session remains active", () => {
  useSessionNotes(id);
  savedResponse()(note);
  expect(cache.getQueryData(queryKeys.sessionNotes.read(id))).toMatchObject({ pages: [{ items: [note] }] });
});

it.each([null, { id: "new-session", endedAt: null }])("a late note response cannot restore a notebook cleared by Finish: %s", active => {
  useSessionNotes(id);
  const respond = savedResponse();
  cache.setQueryData(queryKeys.sessionNotes.read(id), { pages: [{ items: [] }] });
  cache.setQueryData(queryKeys.activeSession(), null);
  clearClientSelections(cache, id);
  cache.setQueryData(queryKeys.activeSession(), active);
  respond(note);
  expect(cache.getQueryData(queryKeys.sessionNotes.read(id))).toBeUndefined();
  expect(cache.getQueryData(queryKeys.activeSession())).toEqual(active);
});
