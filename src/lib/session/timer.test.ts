import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startSessionTimer, type CompletionGuard } from "./timer";
import { useSessionStore } from "@/stores/sessionStore";
import type { Session } from "@/types/domain";

const start = new Date("2026-10-13T12:00:00Z");
const session: Session = { id: "session-one", startedAt: start.toISOString(), endedAt: null, plannedMinutes: 5,
  actualSeconds: 0, endedReason: null, characterSlug: "rain-desk", localDate: "2026-10-13", task: null };
let documentStub: EventTarget & { hidden: boolean };
let cleanups: Array<() => void>;

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(start);
  documentStub = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", documentStub);
  useSessionStore.setState({ elapsedSeconds: 0, remainingSeconds: null, isFinishing: false });
  cleanups = [];
});
afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
});

function mount(value: Session = session, guard: CompletionGuard = { requested: false }) {
  const finish = vi.fn(() => useSessionStore.getState().setFinishing(true));
  const heartbeat = vi.fn(async () => {});
  const cleanup = startSessionTimer(value, {
    setTick: (elapsed, remaining) => useSessionStore.getState().setTick(elapsed, remaining),
    isFinishing: () => useSessionStore.getState().isFinishing, finish, heartbeat,
  }, guard);
  cleanups.push(cleanup);
  return { finish, heartbeat, cleanup };
}

describe("timestamp-based session timer lifecycle", () => {
  it("publishes 5:00 synchronously and recomputes every second", () => {
    mount();
    expect(useSessionStore.getState()).toMatchObject({ elapsedSeconds: 0, remainingSeconds: 300 });
    vi.advanceTimersByTime(10_000);
    expect(useSessionStore.getState()).toMatchObject({ elapsedSeconds: 10, remainingSeconds: 290 });
  });
  it("refresh mid-session immediately resumes from startedAt", () => {
    const first = mount();
    vi.advanceTimersByTime(10_000); first.cleanup();
    vi.setSystemTime(new Date(start.getTime() + 123_999));
    mount();
    expect(useSessionStore.getState()).toMatchObject({ elapsedSeconds: 123, remainingSeconds: 177 });
  });
  it("recomputes a three-hour sleep gap from timestamps instead of ticks", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const timer = mount({ ...session, plannedMinutes: null });
    vi.advanceTimersByTime(1000);
    vi.setSystemTime(new Date(start.getTime() + 3 * 3600_000));
    vi.advanceTimersByTime(1000);
    expect(useSessionStore.getState()).toMatchObject({ elapsedSeconds: 10801, remainingSeconds: null });
    expect(debug).toHaveBeenCalledWith("Session timer resumed after a suspension", expect.objectContaining({ id: session.id }));
    expect(timer.finish).not.toHaveBeenCalled();
    expect(timer.heartbeat).toHaveBeenCalledOnce();
  });
  it("automatically finishes exactly once at the deadline", () => {
    const timer = mount();
    vi.advanceTimersByTime(300_000);
    expect(timer.finish).toHaveBeenCalledOnce();
    expect(useSessionStore.getState()).toMatchObject({ elapsedSeconds: 300, remainingSeconds: 0, isFinishing: true });
    useSessionStore.getState().setFinishing(false);
    vi.advanceTimersByTime(60_000);
    documentStub.dispatchEvent(new Event("visibilitychange"));
    expect(timer.finish).toHaveBeenCalledOnce();
  });
  it("keeps the completion guard through Strict Mode effect teardown/restart", () => {
    vi.setSystemTime(new Date(start.getTime() + 301_000));
    const guard = { requested: false };
    const first = mount(session, guard); first.cleanup();
    const second = mount(session, guard);
    expect(first.finish).toHaveBeenCalledOnce();
    expect(second.finish).not.toHaveBeenCalled();
  });
  it("waits while a manual Finish is already in flight", () => {
    useSessionStore.getState().setFinishing(true);
    vi.setSystemTime(new Date(start.getTime() + 301_000));
    const timer = mount();
    expect(timer.finish).not.toHaveBeenCalled();
    useSessionStore.getState().setFinishing(false);
    vi.advanceTimersByTime(1000);
    expect(timer.finish).toHaveBeenCalledOnce();
  });
  it("pauses hidden intervals and recomputes immediately when visible", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const timer = mount();
    documentStub.hidden = true; documentStub.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(new Date(start.getTime() + 600_000));
    expect(timer.finish).not.toHaveBeenCalled();
    documentStub.hidden = false; documentStub.dispatchEvent(new Event("visibilitychange"));
    expect(useSessionStore.getState()).toMatchObject({ elapsedSeconds: 600, remainingSeconds: 0 });
    expect(timer.finish).toHaveBeenCalledOnce();
    expect(debug).toHaveBeenCalledOnce();
  });
  it("sends heartbeat every sixty seconds without banked duration", () => {
    const timer = mount({ ...session, plannedMinutes: null });
    vi.advanceTimersByTime(59_000); expect(timer.heartbeat).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); expect(timer.heartbeat).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60_000); expect(timer.heartbeat).toHaveBeenCalledTimes(2);
    expect(timer.heartbeat.mock.calls).toEqual([[], []]);
  });
  it("catches heartbeat errors so the display timer keeps working", async () => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    const timer = mount({ ...session, plannedMinutes: null });
    timer.heartbeat.mockRejectedValue(new Error("Storage unavailable"));
    await vi.advanceTimersByTimeAsync(61_000);
    expect(useSessionStore.getState().elapsedSeconds).toBe(61);
    expect(console.debug).toHaveBeenCalledWith("Session heartbeat unavailable", expect.any(Error));
  });
  it("cleans intervals and the visibility listener on unmount", () => {
    const timer = mount(); timer.cleanup();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(600_000);
    documentStub.dispatchEvent(new Event("visibilitychange"));
    expect(useSessionStore.getState().elapsedSeconds).toBe(0);
    expect(timer.finish).not.toHaveBeenCalled(); expect(timer.heartbeat).not.toHaveBeenCalled();
  });
  it("uses the development clock offset immediately after a refresh", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubGlobal("window", { localStorage: { getItem: () => "600000" } });
    const timer = mount();
    expect(useSessionStore.getState()).toMatchObject({ elapsedSeconds: 600, remainingSeconds: 0 });
    expect(timer.finish).toHaveBeenCalledOnce();
  });
  it("never auto-finishes an ended session or produces negative elapsed time", () => {
    vi.setSystemTime(new Date(start.getTime() - 60_000));
    const timer = mount({ ...session, endedAt: start.toISOString(), endedReason: "completed" });
    expect(useSessionStore.getState().elapsedSeconds).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(timer.finish).not.toHaveBeenCalled();
  });
});
