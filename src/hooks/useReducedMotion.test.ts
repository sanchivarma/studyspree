import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSyncExternalStore } from "react";
import { useReducedMotion } from "./useReducedMotion";

const state = vi.hoisted(() => ({ system: false, profile: false, pending: false }));
vi.mock("./useProfile", () => ({ useProfile: () => ({ data: { reduceMotion: state.profile }, isPending: state.pending }) }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useSyncExternalStore: vi.fn((_subscribe, snapshot) => snapshot()) }));
let media: EventTarget & { matches: boolean };
beforeEach(() => {
  state.system = false; state.profile = false; state.pending = false;
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal("window", { matchMedia: vi.fn(() => { media.matches = state.system; return media; }) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it.each([[false, false, false], [true, false, true], [false, true, true], [true, true, true]])("combines system=%s and profile=%s", (system, profile, expected) => {
  state.system = system; state.profile = profile;
  expect(useReducedMotion()).toBe(expected);
});
it("uses the OS preference while the profile loads", () => {
  state.pending = true;
  expect(useReducedMotion()).toBe(false);
});
it("subscribes to preference changes and removes the listener", () => {
  useReducedMotion();
  const [subscribe, snapshot, serverSnapshot] = vi.mocked(useSyncExternalStore).mock.calls.at(-1)!;
  const change = vi.fn();
  const cleanup = subscribe(change);
  state.system = true; media.dispatchEvent(new Event("change"));
  expect(change).toHaveBeenCalledOnce();
  expect(snapshot()).toBe(true);
  expect(serverSnapshot!()).toBe(false);
  cleanup(); media.dispatchEvent(new Event("change"));
  expect(change).toHaveBeenCalledOnce();
});
