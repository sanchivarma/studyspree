import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDevOffset, now, setDevOffset } from "./clock";

const REAL_TIME = new Date("2026-10-13T12:00:00.000Z");
const KEY = "ss_dev_clock_offset_ms";

function browserStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  vi.stubGlobal("window", { localStorage: storage });
  return storage;
}

describe("clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(REAL_TIME);
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns real time during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(now()).toEqual(REAL_TIME);
    expect(() => { setDevOffset(5000); clearDevOffset(); }).not.toThrow();
  });

  it("defaults to real time without an offset", () => {
    browserStorage();
    expect(now()).toEqual(REAL_TIME);
  });

  it("reads fresh time and the current saved offset on every call", () => {
    const storage = browserStorage();
    setDevOffset(5000);
    vi.advanceTimersByTime(1000);
    expect(now().getTime()).toBe(REAL_TIME.getTime() + 6000);
    storage.setItem(KEY, "10000");
    expect(now().getTime()).toBe(REAL_TIME.getTime() + 11000);
  });

  it.each([5000, -5000, 432000000, 0])("applies a %i ms development offset", (offset) => {
    browserStorage();
    setDevOffset(offset);
    expect(now().getTime()).toBe(REAL_TIME.getTime() + offset);
  });

  it("clears the development offset", () => {
    const storage = browserStorage();
    setDevOffset(5000);
    clearDevOffset();
    expect(storage.getItem(KEY)).toBeNull();
    expect(now()).toEqual(REAL_TIME);
  });

  it.each(["oops", "NaN", "Infinity", "1e20"])("ignores invalid saved offset %s", (value) => {
    const storage = browserStorage();
    storage.setItem(KEY, value);
    expect(now()).toEqual(REAL_TIME);
  });

  it.each([NaN, Infinity, -Infinity, 1e20])("rejects invalid offset %s without replacing storage", (value) => {
    const storage = browserStorage();
    setDevOffset(5000);
    setDevOffset(value);
    expect(storage.getItem(KEY)).toBe("5000");
  });

  it("falls back safely when storage access throws", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("Storage unavailable"); } });
    expect(now()).toEqual(REAL_TIME);
    expect(() => { setDevOffset(5000); clearDevOffset(); }).not.toThrow();
  });

  it.each(["production", "test"])("never reads or mutates storage in %s", (environment) => {
    const storage = browserStorage();
    storage.setItem(KEY, "5000");
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", environment);
    setDevOffset(10000);
    clearDevOffset();
    expect(now()).toEqual(REAL_TIME);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
