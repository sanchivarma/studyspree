import { Howl, Howler } from "howler";
import { musicTracks, roomSounds } from "./catalog";

const CROSSFADE_MS = 2000;
const clamp = (volume: number) => Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;

class AudioBus {
  private source: string | null = null;
  private volume = 0;
  private sounds: Howl[] = [];
  private ids: (number | null)[] = [null, null];
  private current = 0;
  private loaded = 0;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private muted = false;
  private generation = 0;

  constructor(private readonly canLoad: () => boolean) {}

  configure(source: string | null, volume: number) {
    if (source !== this.source) { this.unload(); this.source = source; }
    this.volume = clamp(volume);
    if (!source || this.volume === 0) { this.unload(); return; }
    if (!this.canLoad()) return;
    if (!this.sounds.length) {
      const generation = this.generation;
      const valid = () => this.generation === generation && this.sounds.length === 2;
      for (let index = 0; index < 2; index++) {
        this.sounds.push(new Howl({
          src: [source], format: ["webm"], preload: false, autoplay: false, loop: false, volume: 0,
          onload: () => {
            if (!valid()) return;
            this.loaded++;
            if (index === 0) this.sounds[1].load();
            if (this.loaded === 2 && !this.muted) this.resume(500);
          },
          onloaderror: () => { if (valid()) this.unload(); },
          onplayerror: () => { if (valid()) this.unload(); },
          onplay: () => { if (valid() && index === this.current && !this.muted) this.schedule(); },
        }));
      }
      this.sounds[0].load();
    } else if (this.loaded === 2 && !this.muted) {
      // A slider change does not restart playback or disturb the other bus.
      const id = this.ids[this.current];
      if (id !== null) this.sounds[this.current].fade(Number(this.sounds[this.current].volume(id)), this.volume, 100, id);
    }
  }

  private schedule() {
    if (this.loopTimer) clearTimeout(this.loopTimer);
    if (this.muted || this.loaded !== 2) return;
    const sound = this.sounds[this.current];
    const id = this.ids[this.current];
    if (id === null) return;
    const duration = sound.duration();
    if (!Number.isFinite(duration) || duration <= 0) { this.unload(); return; }
    const overlap = Math.min(CROSSFADE_MS, duration * 500);
    const position = Number(sound.seek(id)) || 0;
    this.loopTimer = setTimeout(() => this.crossfade(overlap), Math.max(0, duration * 1000 - overlap - position * 1000));
  }

  private crossfade(overlap: number) {
    if (this.muted || this.sounds.length !== 2) return;
    const previous = this.current;
    const next = 1 - previous;
    const oldId = this.ids[previous];
    this.current = next;
    this.sounds[next].stop(); this.sounds[next].volume(0);
    const newId = this.sounds[next].play(); this.ids[next] = newId;
    this.sounds[next].fade(0, this.volume, overlap, newId);
    if (oldId !== null) this.sounds[previous].fade(Number(this.sounds[previous].volume(oldId)), 0, overlap, oldId);
    this.cleanupTimer = setTimeout(() => {
      this.sounds[previous]?.stop(); this.ids[previous] = null; this.cleanupTimer = null;
    }, overlap);
    this.schedule();
  }

  fadeOut(ms: number) {
    this.muted = true;
    if (this.loopTimer) clearTimeout(this.loopTimer);
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.sounds.forEach((sound, index) => {
      const id = this.ids[index];
      if (id !== null) sound.fade(Number(sound.volume(id)), 0, ms, id);
    });
    this.pauseTimer = setTimeout(() => {
      this.sounds.forEach((sound, index) => { const id = this.ids[index]; if (id !== null) sound.pause(id); });
      this.pauseTimer = null;
    }, ms);
  }

  resume(ms: number) {
    this.muted = false;
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
    if (this.loaded !== 2 || !this.sounds.length || this.volume === 0) return;
    const sound = this.sounds[this.current];
    let id = this.ids[this.current];
    if (id === null) { sound.volume(0); id = sound.play(); this.ids[this.current] = id; }
    else if (!sound.playing(id)) sound.play(id);
    sound.fade(Number(sound.volume(id)), this.volume, ms, id);
    this.schedule();
  }

  unload() {
    this.generation++;
    if (this.loopTimer) clearTimeout(this.loopTimer);
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.loopTimer = this.pauseTimer = this.cleanupTimer = null;
    const sounds = this.sounds; this.sounds = [];
    this.ids = [null, null]; this.loaded = 0; this.current = 0;
    sounds.forEach(sound => { sound.volume(0); sound.unload(); });
  }

  refresh() { this.configure(this.source, this.volume); }
  reset() { this.unload(); this.source = null; this.volume = 0; this.muted = false; }
}

export class AmbienceEngine {
  private initialized = false;
  private readonly music = new AudioBus(() => this.initialized);
  private readonly room = new AudioBus(() => this.initialized);
  private musicSource: string | null = null;
  private roomSource: string | null = null;
  private musicVolume = 0;
  private roomVolume = 0;
  private readonly visibility = () => {
    if (document.hidden) this.fadeOutAll(500); else this.fadeInAll(500);
  };

  // Called synchronously from a user gesture. Importing this module or restoring
  // preferences never creates an AudioContext, a Howl, or an audio request.
  init() {
    if (typeof window === "undefined") return;
    if (!this.initialized) {
      this.initialized = true;
      Howler.volume(1);
      document.addEventListener("visibilitychange", this.visibility);
      if (document.hidden) this.fadeOutAll(0);
    }
    this.music.refresh(); this.room.refresh();
    // Howler may replace its context while unlocking a first Howl. Resume the
    // final context while still inside the initiating user gesture.
    void Howler.ctx?.resume().catch(() => {});
  }
  setMusicTrack(slug: string | null) {
    this.musicSource = musicTracks.find(track => track.slug === slug)?.src ?? null;
    this.music.configure(this.musicSource, this.musicVolume);
  }
  setRoomForTheme(slug: string) {
    this.roomSource = roomSounds[slug as keyof typeof roomSounds] ?? null;
    this.room.configure(this.roomSource, this.roomVolume);
  }
  setMusicVolume(value: number) { this.musicVolume = clamp(value); this.music.configure(this.musicSource, this.musicVolume); }
  setRoomVolume(value: number) { this.roomVolume = clamp(value); this.room.configure(this.roomSource, this.roomVolume); }
  fadeOutAll(ms: number) { this.music.fadeOut(Math.max(0, ms)); this.room.fadeOut(Math.max(0, ms)); }
  fadeInAll(ms: number) { this.music.resume(Math.max(0, ms)); this.room.resume(Math.max(0, ms)); }
  destroy() {
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.visibility);
    this.music.reset(); this.room.reset();
    this.musicSource = this.roomSource = null; this.musicVolume = this.roomVolume = 0;
    this.initialized = false;
    // Do not call Howler.unload(): it creates a replacement global AudioContext.
    // Only our two buses are released; unrelated audio consumers stay intact.
  }
}

export const ambience = new AmbienceEngine();
export const init = () => ambience.init();
export const setMusicTrack = (slug: string | null) => ambience.setMusicTrack(slug);
export const setRoomForTheme = (slug: string) => ambience.setRoomForTheme(slug);
export const setMusicVolume = (volume: number) => ambience.setMusicVolume(volume);
export const setRoomVolume = (volume: number) => ambience.setRoomVolume(volume);
export const fadeOutAll = (ms: number) => ambience.fadeOutAll(ms);
export const fadeInAll = (ms: number) => ambience.fadeInAll(ms);
export const destroy = () => ambience.destroy();
