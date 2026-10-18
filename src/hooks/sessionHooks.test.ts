import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutation, useQuery } from "@tanstack/react-query";
import { repo } from "@/lib/repo";
import { queryKeys } from "@/lib/queryKeys";
import { useSessionStore } from "@/stores/sessionStore";
import { useCompletionStore } from "@/stores/completionStore";
import type { Session } from "@/types/domain";
import type { EndSessionResult, StartSessionInput } from "@/lib/repo/types";
import { useActiveSession } from "./useActiveSession";
import { useStartSession } from "./useStartSession";
import { useEndSession, type EndSessionInput } from "./useEndSession";

const mocks = vi.hoisted(() => ({ invalidate: vi.fn(), push: vi.fn(), getQueryData: vi.fn(), setQueryData: vi.fn() }));
vi.mock("@/lib/clock", () => ({ now: () => new Date("2026-10-13T12:00:10Z") }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: vi.fn(),useRef:vi.fn(value=>({current:value})) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate, getQueryData: mocks.getQueryData, setQueryData: mocks.setQueryData }),
  useMutation: vi.fn(() => ({})), useQuery: vi.fn(() => ({})),
}));
vi.mock("@/lib/repo", () => ({ repo: { getActiveSession: vi.fn(), startSession: vi.fn(), endSession: vi.fn(), getProfile: vi.fn(), getDayStats: vi.fn() } }));

const session: Session = { id: "local-session", startedAt: "2026-10-13T12:00:00Z", endedAt: null,
  plannedMinutes: 5, actualSeconds: 0, endedReason: null, themeSlug: "rain-desk", localDate: "2026-10-13", task: null, companions: { mode: "solo" as const, characterSlugs: [] } };
type MutationCallbacks<Input, Output> = {
  mutationFn: (input: Input) => Promise<Output>;
  onSuccess: (output: Output) => Promise<void> | void;
  onMutate?: () => void;
  onError?: () => void;
};
function callbacks<Input, Output>() {
  // The mocked Query hook captures callbacks for invocation without a DOM.
  return vi.mocked(useMutation).mock.calls.at(-1)![0] as MutationCallbacks<Input, Output>;
}
beforeEach(() => {
  useCompletionStore.getState().clear();
  vi.clearAllMocks(); mocks.invalidate.mockResolvedValue(undefined);
  mocks.getQueryData.mockReturnValue({ timezone: "UTC" });
  vi.mocked(repo.getDayStats).mockResolvedValue([]);
  useSessionStore.setState({ elapsedSeconds: 0, remainingSeconds: null, isFinishing: false });
});

describe("session query and mutation boundaries", () => {
  it("fetches the active session through the shared key and repository", async () => {
    vi.mocked(repo.getActiveSession).mockResolvedValue(session);
    useActiveSession();
    const options = vi.mocked(useQuery).mock.calls[0][0] as { queryKey: readonly string[]; queryFn: () => Promise<Session | null> };
    expect(options.queryKey).toEqual(queryKeys.activeSession());
    expect(await options.queryFn()).toEqual(session);
    expect(repo.getActiveSession).toHaveBeenCalledWith();
  });
  it("starts with configuration only and refreshes without holding up navigation", async () => {
    vi.mocked(repo.startSession).mockResolvedValue(session);
    useStartSession();
    const options = callbacks<StartSessionInput, Session>();
    const input: StartSessionInput = { plannedMinutes: 5, themeSlug: "rain-desk", task: null, companions: { mode: "solo", characterSlugs: [] } };
    expect(await options.mutationFn(input)).toEqual(session);
    expect(repo.startSession).toHaveBeenCalledWith(input);
    let release!: () => void;
    mocks.invalidate.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
    const completing = options.onSuccess(session);
    expect(mocks.setQueryData).toHaveBeenCalledWith(queryKeys.activeSession(), session);
    expect(mocks.push).toHaveBeenCalledWith("/session/local-session");
    release(); await completing;
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.activeSession() });
    expect(mocks.push).toHaveBeenCalledWith("/session/local-session");
    expect(useSessionStore.getState().isFinishing).toBe(false);
  });
  it("finishes with id/reason, seeds trusted totals and refreshes in the background", async () => {
    const ended: EndSessionResult = { session: { ...session, endedAt: "2026-10-13T12:00:10Z", actualSeconds: 10, endedReason: "stopped_early" }, totalSecondsAllTime: 10, dayTotalSeconds: 10, streak: { current: 1, best: 1, changed: true, freezeUsed: false } };
    vi.mocked(repo.endSession).mockResolvedValue(ended);
    useEndSession();
    const options = callbacks<EndSessionInput, EndSessionResult>();
    options.onMutate!();
    expect(useSessionStore.getState().isFinishing).toBe(true);
    expect(await options.mutationFn({ id: session.id, reason: "stopped_early" })).toEqual(ended);
    expect(repo.endSession).toHaveBeenCalledWith(session.id, "stopped_early");
    let release!: () => void;
    mocks.invalidate.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
    const completing = options.onSuccess(ended);
    expect(useCompletionStore.getState().result).toMatchObject(ended);
    expect(mocks.push).toHaveBeenCalledWith("/session/local-session/complete");
    const updateTotal = mocks.setQueryData.mock.calls.find(([key]) => JSON.stringify(key) === JSON.stringify(queryKeys.stats.total()))![1] as (current?: number) => number;
    expect(updateTotal()).toBe(10); expect(updateTotal(100)).toBe(100);
    expect(mocks.invalidate.mock.calls).toEqual([
      [{ queryKey: queryKeys.activeSession() }], [{ queryKey: queryKeys.stats.all() }], [{ queryKey: queryKeys.streak() }], [{ queryKey: queryKeys.achievements() }],
    ]);
    release(); await completing;
    expect(mocks.push).toHaveBeenCalledWith("/session/local-session/complete");
    // Keep the guard up while navigation is committing.
    expect(useSessionStore.getState().isFinishing).toBe(true);
  });
  it("allows a manual retry after an end mutation error without navigation", () => {
    useEndSession();
    const options = callbacks<EndSessionInput, EndSessionResult>();
    options.onMutate!(); options.onError!();
    expect(useSessionStore.getState().isFinishing).toBe(false);
    expect(mocks.invalidate).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled();
  });
});
