import { afterEach, describe, expect, it, vi } from "vitest";
import { useCompletionStore, getCompletionReceipt } from "./completionStore";
import type { EndSessionResult } from "@/lib/repo/types";

const time = vi.hoisted(() => ({ ms: Date.parse("2026-10-14T12:00:00Z") }));
vi.mock("@/lib/clock", () => ({ now: () => new Date(time.ms) }));
const result: EndSessionResult = { session: { id: "receipt", startedAt: "2026-10-14T11:59:50Z", endedAt: "2026-10-14T12:00:00Z", localDate: "2026-10-14", actualSeconds: 10, plannedMinutes: 25, endedReason: "stopped_early", themeSlug: "rain-desk", task: null }, totalSecondsAllTime: 10, dayTotalSeconds: 10, streak: { current: 2, best: 4, changed: true, freezeUsed: true } };
afterEach(() => { useCompletionStore.getState().clear(); time.ms = Date.parse("2026-10-14T12:00:00Z"); });
describe("short-lived completion receipts", () => {
  it("preserves Finish flags immediately and checks route identity", () => {
    useCompletionStore.getState().remember(result);
    expect(getCompletionReceipt("receipt")).toEqual(result);
    expect(getCompletionReceipt("another")).toBeNull();
  });
  it("expires after ten minutes and rejects backwards-clock receipts", () => {
    useCompletionStore.getState().remember(result);
    time.ms += 599999; expect(getCompletionReceipt("receipt")).toEqual(result);
    time.ms++; expect(getCompletionReceipt("receipt")).toBeNull();
    time.ms -= 600001; expect(getCompletionReceipt("receipt")).toBeNull();
  });
  it("clears on a new session without writing study time", () => {
    useCompletionStore.getState().remember(result); useCompletionStore.getState().clear();
    expect(getCompletionReceipt("receipt")).toBeNull(); expect(result.totalSecondsAllTime).toBe(10);
  });
});
