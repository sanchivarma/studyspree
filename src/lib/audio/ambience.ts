import { Howl, Howler } from "howler";
import { musicTracks, roomSounds } from "./catalog";
import { backgroundEffects, type EffectSlug, type EffectVolumes } from "./effects";
import { radioStations } from "./radio";

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
          src: [source], format: [source.endsWith(".wav") ? "wav" : source.endsWith(".mp3") ? "mp3" : "webm"], preload: false, autoplay: false, loop: false, volume: 0,
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
      // A loop seam can have two live sources. Apply a slider change to the
      // retiring source too, so it cannot retain the previous louder level.
      const previous = 1 - this.current;
      const previousId = this.ids[previous];
      if (previousId !== null) {
        if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
        this.sounds[previous].fade(Number(this.sounds[previous].volume(previousId)), 0, 100, previousId);
        this.cleanupTimer = setTimeout(() => {
          this.sounds[previous]?.stop(); this.ids[previous] = null; this.cleanupTimer = null;
        }, 100);
      }
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
    // Cancel pending per-sound fades before muting/releasing the nodes. Otherwise
    // an in-flight ramp can retain its previous target when the master hits zero.
    sounds.forEach(sound => { sound.stop(); sound.volume(0); sound.unload(); });
  }

  refresh() { this.configure(this.source, this.volume); }
  reset() { this.unload(); this.source = null; this.volume = 0; this.muted = false; }
}

export class AmbienceEngine {
  private initialized = false;
  private readonly music = new AudioBus(() => this.initialized);
  private readonly room = new AudioBus(() => this.initialized);
  private readonly effects = new Map<EffectSlug, AudioBus>();
  private selectedEffects: EffectSlug[] | null = null;
  private effectVolumes: EffectVolumes = {};
  private radio: Howl | null = null;
  private radioSlug: string | null = null;
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
    this.music.refresh(); this.room.refresh(); this.effects.forEach(bus => bus.refresh()); this.refreshRadio();
    // Howler may replace its context while unlocking a first Howl. Resume the
    // final context while still inside the initiating user gesture.
    void Howler.ctx?.resume().catch(() => {});
  }
  setMusicTrack(slug: string | null) {
    const station = radioStations.find(station => `radio:${station.id}` === slug && station.streamUrl);
    if (this.radioSlug !== (station?.id ?? null)) {
      this.radio?.unload(); this.radio = null; this.radioSlug = station?.id ?? null;
    }
    if (station) {
      this.music.configure(null, 0); this.musicSource = null;
      this.refreshRadio(); return;
    }
    this.musicSource = musicTracks.find(track => track.slug === slug)?.src ?? null;
    this.music.configure(this.musicSource, this.musicVolume);
  }
  setRoomForTheme(slug: string) {
    this.roomSource = roomSounds[slug as keyof typeof roomSounds] ?? null;
    this.room.configure(this.selectedEffects === null ? this.roomSource : null, this.roomVolume);
  }
  private refreshRadio() {
    const station = radioStations.find(station => station.id === this.radioSlug);
    if (!this.initialized || !station?.streamUrl || this.musicVolume === 0 || document.hidden) { this.radio?.pause(); return; }
    if (!this.radio) this.radio = new Howl({ src: [station.streamUrl], html5: true, format: ["mp3"], preload: false, autoplay: false, volume: this.musicVolume });
    this.radio.volume(this.musicVolume);
    if (!this.radio.playing()) this.radio.play();
  }
  setBackgroundEffects(slugs: readonly EffectSlug[], volumes: EffectVolumes = this.effectVolumes) {
    this.effectVolumes = { ...volumes };
    this.selectedEffects = [...new Set(slugs)];
    this.room.configure(null, 0);
    for (const [slug, bus] of this.effects) if (!this.selectedEffects.includes(slug)) { bus.reset(); this.effects.delete(slug); }
    for (const effect of backgroundEffects.filter(effect => this.selectedEffects!.includes(effect.slug))) {
      let bus = this.effects.get(effect.slug);
      if (!bus) { bus = new AudioBus(() => this.initialized); this.effects.set(effect.slug, bus); if (typeof document !== "undefined" && document.hidden) bus.fadeOut(0); }
      bus.configure(effect.src, this.roomVolume * clamp(this.effectVolumes[effect.slug] ?? 1) / Math.max(1, Math.sqrt(this.selectedEffects.length)));
    }
  }
  setMusicVolume(value: number) { this.musicVolume = clamp(value); this.music.configure(this.musicSource, this.musicVolume); this.refreshRadio(); }
  setRoomVolume(value: number) { this.roomVolume = clamp(value); if (this.selectedEffects === null) this.room.configure(this.roomSource, this.roomVolume); else this.setBackgroundEffects(this.selectedEffects); }
  fadeOutAll(ms: number) { this.music.fadeOut(Math.max(0, ms)); this.room.fadeOut(Math.max(0, ms)); this.effects.forEach(bus => bus.fadeOut(Math.max(0, ms))); if (this.radio) { const radio = this.radio; radio.fade(Number(radio.volume()), 0, ms); radio.once("fade", () => { if (document.hidden) radio.pause(); }); } }
  fadeInAll(ms: number) { this.music.resume(Math.max(0, ms)); this.room.resume(Math.max(0, ms)); this.effects.forEach(bus => bus.resume(Math.max(0, ms))); this.refreshRadio(); }
  destroy() {
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.visibility);
    this.music.reset(); this.room.reset();
    this.effects.forEach(bus => bus.reset()); this.effects.clear(); this.selectedEffects = null;
    this.effectVolumes = {};
    this.radio?.unload(); this.radio = null; this.radioSlug = null;
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
