import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbienceEngine } from "./ambience";
import type { HowlOptions } from "howler";
import { radioStations } from "./radio";

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
  it.each(["piano-nocturne", "piano-gymnopedie", "piano-moonlight"] as const)("starts %s independently after the first gesture", slug => {
    engine.setBackgroundEffects([slug], { [slug]: 0.4 });
    engine.setRoomVolume(0.5);
    expect(mocks.sounds).toHaveLength(0);
    engine.init();
    expect(mocks.sounds).toHaveLength(2);
    expect(mocks.sounds[0].options).toMatchObject({ format: ["mp3"], html5: false, loop: false });
    loaded();
    expect(mocks.sounds[0].play).toHaveBeenCalledOnce();
    expect(mocks.sounds[0].fade).toHaveBeenCalledWith(0.5, 0.2, 500, 1);
    expect(mocks.sounds[1].play).not.toHaveBeenCalled();
  });
  it("plays an approved direct radio as one streaming source after a gesture", () => {
    radioStations.push({ id: "test-radio", name: "Test", website: "https://radio.example.test", permissionUrl: "https://radio.example.test/permission", embedUrl: null, streamUrl: "https://radio.example.test/live.mp3" });
    try {
      engine.setMusicTrack("radio:test-radio"); engine.setMusicVolume(0.4);
      expect(mocks.sounds).toHaveLength(0);
      engine.init(); expect(mocks.sounds).toHaveLength(1);
      expect(mocks.sounds[0].options).toMatchObject({ html5: true, src: ["https://radio.example.test/live.mp3"], format: ["mp3"] });
      engine.setMusicTrack(null); expect(mocks.sounds[0].unload).toHaveBeenCalledOnce();
    } finally { radioStations.pop(); }
  });
  it("keeps approved direct radio playing and adjustable while the document is hidden", () => {
    radioStations.push({ id: "background-radio", name: "Test", website: "https://radio.example.test", permissionUrl: "https://radio.example.test/permission", embedUrl: null, streamUrl: "https://radio.example.test/live.mp3" });
    try {
      Object.assign(document, { hidden: true });
      engine.setMusicTrack("radio:background-radio"); engine.setMusicVolume(0.4);
      expect(mocks.sounds).toHaveLength(0);
      engine.init(); const radio = mocks.sounds[0];
      expect(radio.play).toHaveBeenCalledOnce();
      engine.setMusicVolume(0.2);
      expect(radio.volume).toHaveBeenLastCalledWith(0.2);
      expect(radio.pause).not.toHaveBeenCalled();
      expect(radio.unload).not.toHaveBeenCalled();
    } finally { radioStations.pop(); }
  });
  it("mixes selected effects lazily, preserves music and releases removed sources", () => {
    engine.setBackgroundEffects(["rain", "wind"]); engine.setRoomVolume(0.6);
    expect(mocks.sounds).toHaveLength(0);
    engine.init(); expect(mocks.sounds).toHaveLength(4);
    expect(mocks.sounds.every(sound => sound.options.format?.[0] === "mp3")).toBe(true);
    loaded(); loaded(2);
    expect(mocks.sounds[0].fade).toHaveBeenLastCalledWith(0.5, 0.6 / Math.sqrt(2), 500, 1);
    engine.setMusicTrack("still-water"); engine.setMusicVolume(0.2);
    engine.setBackgroundEffects(["rain"]);
    expect(mocks.sounds[0].unload).toHaveBeenCalledOnce(); // Wind is catalog-first.
    expect(mocks.sounds[2].unload).not.toHaveBeenCalled();
    expect(mocks.sounds[4].unload).not.toHaveBeenCalled();
    engine.setBackgroundEffects([]); expect(mocks.sounds[2].unload).toHaveBeenCalledOnce();
    engine.destroy(); expect(vi.getTimerCount()).toBe(0);
  });
  it("master effects volume updates every live source and preserves independent levels", () => {
    engine.setBackgroundEffects(["rain", "wind"], { rain: 0.8, wind: 0.2 });
    engine.setRoomVolume(0.5); engine.init(); loaded(); loaded(2);
    expect(mocks.sounds[0].fade).toHaveBeenLastCalledWith(0.5, 0.5 * 0.2 / Math.sqrt(2), 500, 1);
    expect(mocks.sounds[2].fade).toHaveBeenLastCalledWith(0.5, 0.5 * 0.8 / Math.sqrt(2), 500, 1);
    engine.setRoomVolume(1);
    expect(mocks.sounds[0].fade).toHaveBeenLastCalledWith(0.5, 0.2 / Math.sqrt(2), 100, 1);
    expect(mocks.sounds[2].fade).toHaveBeenLastCalledWith(0.5, 0.8 / Math.sqrt(2), 100, 1);
    engine.setRoomVolume(0);
    expect(mocks.sounds.every(sound => sound.unload.mock.calls.length === 1)).toBe(true);
    engine.setRoomVolume(0.5); expect(mocks.sounds).toHaveLength(8);
    engine.destroy(); expect(vi.getTimerCount()).toBe(0);
  });
  it("updates both live sources when the master changes during a loop crossfade", () => {
    engine.setBackgroundEffects(["rain"], { rain: 0.5 });
    engine.setRoomVolume(0.8); engine.init(); loaded();
    vi.advanceTimersByTime(4000);
    expect(mocks.sounds[1].play).toHaveBeenCalledOnce();
    engine.setRoomVolume(0.2);
    expect(mocks.sounds[1].fade).toHaveBeenLastCalledWith(0.5, 0.1, 100, 1);
    expect(mocks.sounds[0].fade).toHaveBeenLastCalledWith(0.5, 0, 100, 1);
    vi.advanceTimersByTime(100);
    expect(mocks.sounds[0].stop).toHaveBeenCalledOnce();
    engine.setRoomVolume(0);
    expect(mocks.sounds.every(sound => sound.unload.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("loads original music independently from the theme sound without changing a saved silent selection", () => {
    engine.setMusicTrack("still-water"); engine.setMusicVolume(0.2);
    expect(mocks.sounds).toHaveLength(0);
    engine.init();
    expect(mocks.sounds[0].options.src).toEqual(["/audio/still-water-v1.webm"]);
    engine.setMusicTrack("silent");
    expect(mocks.sounds[0].unload).toHaveBeenCalledOnce();
    expect(mocks.sounds[2].options.src).toEqual(["/audio/rain.webm"]);
  });
  it("restores preferences without any context, Howl or request before init", () => {
    engine.setMusicTrack("silent"); engine.setMusicVolume(0.4); engine.setRoomForTheme("night-shift"); engine.setRoomVolume(0.2);
    expect(mocks.sounds).toHaveLength(0); expect(mocks.volume).not.toHaveBeenCalled();
    engine.init(); expect(mocks.volume).toHaveBeenCalledExactlyOnceWith(1);
    expect(mocks.sounds.map(sound => sound.options.src)).toEqual([["/audio/rain.webm"], ["/audio/rain.webm"], ["/audio/city-night-v1.webm"], ["/audio/city-night-v1.webm"]]);
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
    expect(mocks.sounds[4].options.src).toEqual(["/audio/keyboard-room-v1.webm"]);
  });
  it("music and effects keep playing at their selected volume across visibility changes", () => {
    engine.setMusicTrack("still-water"); engine.setMusicVolume(0.2);
    engine.setBackgroundEffects(["rain"]);
    engine.setRoomVolume(0.4); engine.init(); loaded(); loaded(2);
    const notify = () => vi.mocked(document.addEventListener).mock.calls
      .filter(([event]) => event === "visibilitychange").forEach(([, listener]) => (listener as () => void)());
    Object.assign(document, { hidden: true }); notify(); vi.advanceTimersByTime(1000);
    expect(mocks.sounds.every(sound => !sound.pause.mock.calls.length && !sound.unload.mock.calls.length)).toBe(true);
    engine.setRoomVolume(0.3);
    expect(mocks.sounds[2].fade).toHaveBeenLastCalledWith(0.5, 0.3, 100, 1);
    Object.assign(document, { hidden: false }); notify();
    expect(mocks.sounds.every(sound => sound.fade.mock.calls.every(([, target]) => target !== 0))).toBe(true);
  });
  it("explicit fade-out still pauses a bus and explicit fade-in restores it", () => {
    engine.init(); engine.setRoomForTheme("rain-desk"); engine.setRoomVolume(0.4); loaded();
    engine.fadeOutAll(500);
    expect(mocks.sounds[0].fade).toHaveBeenCalledWith(0.5, 0, 500, 1);
    vi.advanceTimersByTime(500); expect(mocks.sounds[0].pause).toHaveBeenCalledWith(1);
    engine.fadeInAll(500);
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
    engine.destroy(); expect(vi.getTimerCount()).toBe(0);
    expect(mocks.sounds.every(sound => sound.unload.mock.calls.length > 0)).toBe(true);
  });
});
