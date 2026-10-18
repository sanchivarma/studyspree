import { expect, test } from "@playwright/test";
import { backgroundEffects } from "../src/lib/audio/effects";

test("effects decode to distinct audible signals and the new cafe is substantially louder", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/login");
  const levels = new Map<string, number>(); const fingerprints = new Set<string>();
  for (const src of ["/audio/effect-cafe-v2.mp3", ...backgroundEffects.map(effect => effect.src)]) {
    const response = await page.request.get(src);
    expect(response.ok(), src).toBe(true); expect((await response.body()).length, src).toBeLessThan(8000000);
    const result = await page.evaluate(async src => {
      const bytes = await (await fetch(src)).arrayBuffer();
      const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).join(",");
      const audio = await new OfflineAudioContext(2, 44100, 44100).decodeAudioData(bytes);
      let energy = 0, peak = 0; const samples = audio.getChannelData(0);
      for (const sample of samples) { energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
      return { rms: Math.sqrt(energy / samples.length), peak, duration: audio.duration, fingerprint };
    }, src);
    expect(result.duration, src).toBeGreaterThan(10);
    expect(result.rms, src).toBeGreaterThan(0.001); expect(result.peak, src).toBeLessThan(1);
    if (["/audio/effect-cafe-v3.mp3", "/audio/effect-medieval-v1.mp3", "/audio/effect-library-v2.mp3", "/audio/effect-castle-v1.mp3"].includes(src)) {
      expect(result.peak, src).toBeLessThan(0.95); // Normalized additions retain headroom.
    }
    expect(fingerprints.has(result.fingerprint), src).toBe(false); fingerprints.add(result.fingerprint);
    levels.set(src, result.rms);
  }
  expect(levels.get("/audio/effect-cafe-v3.mp3")!).toBeGreaterThan(levels.get("/audio/effect-cafe-v2.mp3")! * 1.5);
});
