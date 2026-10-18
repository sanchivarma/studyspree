import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ mutation: vi.fn(), push: vi.fn(), set: vi.fn(), invalidate: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useMutation: mocks.mutation, useQueryClient: () => ({ setQueryData: mocks.set, invalidateQueries: mocks.invalidate }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
import { useStartSession } from "./useStartSession";
import { queryKeys } from "@/lib/queryKeys";
import type { Session } from "@/types/domain";
beforeEach(() => { vi.clearAllMocks(); mocks.invalidate.mockReturnValue(new Promise(() => {})); });
const session: Session = { id: "running", startedAt: "2026-10-17T12:00:00Z", endedAt: null, plannedMinutes: 5, actualSeconds: 0, endedReason: null, themeSlug: "rain-desk", localDate: "2026-10-17", task: null, companions: { mode: "solo", characterSlugs: [] } };
function started(value: Session) { (mocks.mutation.mock.calls.at(-1)![0] as { onSuccess: (session: Session) => void }).onSuccess(value); }
it("routes immediately after a trusted Start result even if the refresh never resolves", () => {
  const callback = vi.fn(); useStartSession(callback); started(session);
  expect(mocks.set).toHaveBeenCalledWith(queryKeys.activeSession(), session);
  expect(mocks.invalidate).toHaveBeenCalled(); expect(mocks.push).toHaveBeenCalledWith("/session/running");
  expect(callback).toHaveBeenCalledWith(session);
});
it("opens the returned public joining room while keeping the same active session", () => {
  useStartSession(); const shared = { ...session, visibility: "public" as const, roomId: "joining-room" }; started(shared);
  expect(mocks.set).toHaveBeenCalledWith(queryKeys.activeSession(), shared);
  expect(mocks.push).toHaveBeenCalledWith("/rooms/joining-room");
});
