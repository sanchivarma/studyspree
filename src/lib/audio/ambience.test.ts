import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbienceEngine } from "./ambience";
import type { HowlOptions } from "howler";

const mocks = vi.hoisted(() => ({ sounds: [] as {
  options: HowlOptions; load: ReturnType<typeof vi.fn>; unload: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; fade: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>; volume: ReturnType<typeof vi.fn>; duration: ReturnType<typeof vi.fn>;
}[], volume: vi.fn(), resume: vi.fn() }));
vi.mock("howler", () => ({
  Howler: { volume: mocks.volume, ctx: { resume: mocks.resume } },
  Howl: class {
    options: HowlOptions;
    load = vi.fn(() => this);
    unload = vi.fn(); stop = vi.fn(); pause = vi.fn(); fade = vi.fn();
    volume = vi.fn(() => 0.5); duration = vi.fn(() => 6); seek = vi.fn(() => 0); playing = vi.fn(() => false);
    play = vi.fn(() => 1);
    constructor(options: HowlOptions) { this.options = options; mocks.sounds.push(this); }
  },
}));

let engine: AmbienceEngine;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); mocks.sounds.length = 0; mocks.resume.mockResolvedValue(undefined);
  vi.stubGlobal("window", {}); vi.stubGlobal("document", { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  engine = new AmbienceEngine();
});
afterEach(() => { engine.destroy(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function loaded(from = 0) { mocks.sounds[from].options.onload?.(1); mocks.sounds[from + 1].options.onload?.(1); }

describe("two independent, gesture-gated audio buses", () => {
  it("restores preferences without any context, Howl or request before init", () => {
    engine.setMusicTrack("silent"); engine.setMusicVolume(0.4); engine.setRoomForTheme("night-shift"); engine.setRoomVolume(0.2);
    expect(mocks.sounds).toHaveLength(0); expect(mocks.volume).not.toHaveBeenCalled();
    engine.init(); expect(mocks.volume).toHaveBeenCalledExactlyOnceWith(1);
    expect(mocks.sounds.map(sound => sound.options.src)).toEqual([["/audio/rain.webm"], ["/audio/rain.webm"], ["/audio/city-night.webm"], ["/audio/city-night.webm"]]);
    expect(mocks.sounds.every(sound => sound.options.autoplay === false && sound.options.preload === false)).toBe(true);
  });
  it("loads the second Howl after the first and crossfades for two seconds before stopping the old one", () => {
    engine.init(); engine.setRoomForTheme("rain-desk"); engine.setRoomVolume(0.5);
    expect(mocks.sounds[0].load).toHaveBeenCalledOnce(); expect(mocks.sounds[1].load).not.toHaveBeenCalled();
    mocks.sounds[0].options.onload?.(1); expect(mocks.sounds[1].load).toHaveBeenCalledOnce();
    mocks.sounds[1].options.onload?.(1);
    vi.advanceTimersByTime(3999); expect(mocks.sounds[1].play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(mocks.sounds[1].fade).toHaveBeenCalledWith(0, 0.5, 2000, 1);
    expect(mocks.sounds[0].fade).toHaveBeenCalledWith(0.5, 0, 2000, 1);
    vi.advanceTimersByTime(2000); expect(mocks.sounds[0].stop).toHaveBeenCalled();
  });
  it("changing room theme releases that bus without disturbing music", () => {
    engine.init(); engine.setMusicTrack("silent"); engine.setMusicVolume(0.5); loaded();
    engine.setRoomForTheme("rain-desk"); engine.setRoomVolume(0.3); loaded(2);
    engine.setRoomForTheme("dorm-bunk");
    expect(mocks.sounds[0].unload).not.toHaveBeenCalled(); expect(mocks.sounds[1].unload).not.toHaveBeenCalled();
    expect(mocks.sounds[2].unload).toHaveBeenCalledOnce(); expect(mocks.sounds[3].unload).toHaveBeenCalledOnce();
    expect(mocks.sounds[4].options.src).toEqual(["/audio/keyboard-room.webm"]);
  });
  it("visibility fades to zero and pauses, then resumes at the selected volume", () => {
    engine.init(); engine.setRoomForTheme("rain-desk"); engine.setRoomVolume(0.4); loaded();
    const listener = vi.mocked(document.addEventListener).mock.calls[0][1] as () => void;
    Object.assign(document, { hidden: true }); listener();
    expect(mocks.sounds[0].fade).toHaveBeenCalledWith(0.5, 0, 500, 1);
    vi.advanceTimersByTime(500); expect(mocks.sounds[0].pause).toHaveBeenCalledWith(1);
    Object.assign(document, { hidden: false }); listener();
    expect(mocks.sounds[0].fade).toHaveBeenCalledWith(0.5, 0.4, 500, 1);
  });
  it("unloads missing files silently and ignores stale callbacks after switching", () => {
    engine.init(); engine.setRoomForTheme("rain-desk"); engine.setRoomVolume(0.3);
    const old = mocks.sounds[0]; engine.setRoomForTheme("night-shift");
    old.options.onloaderror?.(1, "404"); expect(mocks.sounds[2].unload).not.toHaveBeenCalled();
    mocks.sounds[2].options.onloaderror?.(1, "404"); expect(mocks.sounds[2].unload).toHaveBeenCalledOnce();
    expect(mocks.sounds[3].unload).toHaveBeenCalledOnce();
  });
  it("clamps volumes, never loads unknown tracks, and clears all owned timers and listeners", () => {
    engine.init(); engine.setMusicTrack("unknown"); engine.setMusicVolume(2); expect(mocks.sounds).toHaveLength(0);
    engine.setRoomForTheme("rain-desk"); engine.setRoomVolume(-1); expect(mocks.sounds).toHaveLength(0);
    engine.setRoomVolume(2); loaded(); expect(mocks.sounds[0].fade).toHaveBeenCalledWith(0.5, 1, 500, 1);
    engine.destroy(); expect(vi.getTimerCount()).toBe(0); expect(document.removeEventListener).toHaveBeenCalled();
    expect(mocks.sounds.every(sound => sound.unload.mock.calls.length > 0)).toBe(true);
  });
});
