import { expect, test } from "@playwright/test";
import { themes } from "../src/lib/themes/registry";
import { roomSounds, musicTracks } from "../src/lib/audio/catalog";

test("all original scene files decode, remain muted, fit the budget and loop without a visual jump", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/login");
  for (const theme of themes) {
    const poster = await page.request.get(theme.poster);
    expect(poster.ok()).toBe(true);
    expect(poster.headers()["cache-control"]).toContain("immutable");
    for (const src of [theme.webm, theme.mp4]) {
      const response = await page.request.get(src);
      expect(response.ok()).toBe(true);
      expect((await response.body()).length).toBeLessThan(8000000);
      const result = await page.evaluate(async src => {
        const movie = document.createElement("video"); movie.muted = true; movie.preload = "auto";
        const ready = new Promise<void>((resolve, reject) => { movie.onloadeddata = () => resolve(); movie.onerror = () => reject(new Error(`Cannot decode ${src}`)); });
        movie.src = src; await ready;
        const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 90;
        const ctx = canvas.getContext("2d")!;
        const sample = async (time: number) => {
          const seek = new Promise<void>(resolve => { movie.onseeked = () => resolve(); }); movie.currentTime = time; await seek;
          ctx.drawImage(movie, 0, 0, 160, 90); return ctx.getImageData(0, 0, 160, 90).data;
        };
        const start = await sample(0.05), end = await sample(Math.min(11.95, movie.duration - 0.05));
        let difference = 0;
        for (let i = 0; i < start.length; i++) if (i % 4 !== 3) difference += Math.abs(start[i] - end[i]);
        const result = { width: movie.videoWidth, height: movie.videoHeight, duration: movie.duration, seamDifference: difference / (160 * 90 * 3) };
        movie.removeAttribute("src"); movie.load(); return result;
      }, src);
      expect(result.width).toBe(1280); expect(result.height).toBe(720);
      expect(result.duration).toBeGreaterThan(11); expect(result.duration).toBeLessThan(14);
      expect(result.seamDifference).toBeLessThan(12);
    }
  }
});

test("room sounds and original music decode to audible, distinct signals", async ({ page }) => {
  await page.goto("/login");
  const sources = [...Object.values(roomSounds), musicTracks.find(track => track.slug === "still-water")!.src];
  const fingerprints = new Set<string>();
  for (const src of sources) {
    const result = await page.evaluate(async src => {
      const response = await fetch(src); if (!response.ok) throw new Error(`Missing audio: ${src}`);
      const bytes = await response.arrayBuffer();
      // decodeAudioData may detach its input buffer; hash before decoding it.
      const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).join(",");
      const context = new OfflineAudioContext(2, 48000, 48000);
      const buffer = await context.decodeAudioData(bytes);
      const samples = buffer.getChannelData(0); let energy = 0, peak = 0;
      for (const sample of samples) { energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
      return { duration: buffer.duration, rms: Math.sqrt(energy / samples.length), peak, fingerprint };
    }, src);
    expect(result.duration).toBeGreaterThan(15);
    expect(result.rms).toBeGreaterThan(0.001); expect(result.peak).toBeLessThan(0.9);
    expect(fingerprints.has(result.fingerprint)).toBe(false); fingerprints.add(result.fingerprint);
  }
});
