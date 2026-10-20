import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserTab } from "@/lib/session/browserTab";
import { LocalRepository } from "./local";

const browser = vi.hoisted(() => ({ tab: undefined as BrowserTab | undefined }));
vi.mock("@/lib/session/browserTab", () => ({ browserTab: () => browser.tab }));
vi.mock("@/lib/clock", () => ({ now: () => new Date(Date.now()) }));
const tabA = "00000000-0000-4000-8000-000000000001";
const tabB = "00000000-0000-4000-8000-000000000002";
const docA = "00000000-0000-4000-8000-000000000011";
const docB = "00000000-0000-4000-8000-000000000012";
const input = { plannedMinutes: null, themeSlug: "rain-desk", task: null };

describe("browser session accounting", () => {
  let repo: LocalRepository;
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    const storage = new Map<string, string>();
    repo = new LocalRepository(() => ({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } }));
    browser.tab = { tabId: tabA, documentId: docA, reload: false };
  });
  afterEach(() => { vi.useRealTimers(); browser.tab = undefined; });

  it("finishes at tab close, without counting time while the browser was closed", async () => {
    const session = await repo.startSession(input);
    vi.advanceTimersByTime(12_000); repo.releaseSessionTab(session.id);
    vi.advanceTimersByTime(3_600_000);
    browser.tab = { tabId: tabB, documentId: docB, reload: false };
    expect(await repo.getActiveSession()).toBeNull();
    expect(await repo.getSession(session.id)).toMatchObject({ actualSeconds: 12, endedReason: "stopped_early", endedAt: "2026-10-20T12:00:12.000Z" });
    expect(await repo.getTotalSecondsAllTime()).toBe(12);
    expect(await repo.getActiveSession()).toBeNull();
    expect(await repo.getTotalSecondsAllTime()).toBe(12);
    expect((await repo.getStreak()).best).toBe(1);
  });
  it("a new tab settles a close immediately, including within the refresh grace period", async () => {
    const session = await repo.startSession(input);
    vi.advanceTimersByTime(5000); repo.releaseSessionTab(session.id);
    browser.tab = { tabId: tabB, documentId: docB, reload: false };
    expect(await repo.getActiveSession()).toBeNull();
    expect((await repo.getSession(session.id))?.actualSeconds).toBe(5);
  });
  it("refresh preserves the original session and ignores a delayed close from its old document", async () => {
    const session = await repo.startSession(input);
    vi.advanceTimersByTime(10_000); repo.releaseSessionTab(session.id);
    browser.tab = { tabId: tabA, documentId: docB, reload: true };
    expect(await repo.getActiveSession()).toEqual(session);
    browser.tab = { tabId: tabA, documentId: docA, reload: false };
    repo.releaseSessionTab(session.id);
    browser.tab = { tabId: tabA, documentId: docB, reload: true };
    vi.advanceTimersByTime(60_000);
    expect(await repo.getActiveSession()).toEqual(session);
  });
  it("keeps studying while another app tab is open, but an old request cannot reopen a closed tab", async () => {
    const session = await repo.startSession(input);
    browser.tab = { tabId: tabB, documentId: docB, reload: false };
    await repo.getActiveSession();
    browser.tab = { tabId: tabA, documentId: docA, reload: false };
    vi.advanceTimersByTime(10_000); repo.releaseSessionTab(session.id);
    await repo.getActiveSession(); // A request sent before pagehide arrives late.
    browser.tab = { tabId: tabB, documentId: docB, reload: false };
    expect(await repo.getActiveSession()).toEqual(session);
    vi.advanceTimersByTime(5000); repo.releaseSessionTab(session.id);
    browser.tab = undefined;
    vi.advanceTimersByTime(30_000);
    expect(await repo.getActiveSession()).toBeNull();
    expect((await repo.getSession(session.id))?.actualSeconds).toBe(15);
  });
  it("ordinary reads and heartbeats keep an open session running", async () => {
    const session = await repo.startSession(input);
    vi.advanceTimersByTime(3_600_000); await repo.heartbeat(session.id);
    expect(await repo.getActiveSession()).toEqual(session);
    expect(await repo.getTotalSecondsAllTime()).toBe(0);
  });
});
