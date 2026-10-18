import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

const pieces = [
  { name: "Chopin · Nocturne Op. 9 No. 2", slug: "piano-nocturne", file: "piano-chopin-nocturne-op9-no2-v1.mp3", seconds: 276 },
  { name: "Satie · Gymnopédie No. 1", slug: "piano-gymnopedie", file: "piano-satie-gymnopedie-no1-v1.mp3", seconds: 183 },
  { name: "Beethoven · Moonlight Sonata I", slug: "piano-moonlight", file: "piano-beethoven-moonlight-i-v1.mp3", seconds: 335 },
] as const;

test("three locally bundled piano performances decode fully and their levels persist without source links", async ({ page }) => {
  test.setTimeout(90000);
  await signIn(page);
  await page.goto("/settings");
  const effects = page.getByRole("group", { name: "Background effects", exact: true });
  for (const piece of pieces) {
    const result = await page.evaluate(async file => {
      const response = await fetch(`/audio/${file}`);
      if (!response.ok) throw new Error(`Local audio unavailable: ${response.status}`);
      const bytes = await response.arrayBuffer();
      const audio = await new OfflineAudioContext(2, 44100, 44100).decodeAudioData(bytes);
      let energy = 0, peak = 0;
      for(const value of audio.getChannelData(0)) { energy += value*value; peak = Math.max(peak,Math.abs(value)); }
      return { bytes: bytes.byteLength, duration: audio.duration, rms: Math.sqrt(energy/audio.length), peak };
    }, piece.file);
    expect(result.bytes).toBeLessThan(8000000);
    expect(result.duration).toBeGreaterThan(piece.seconds);
    expect(result.duration).toBeLessThan(piece.seconds + 3);
    expect(result.rms).toBeGreaterThan(0.001);
    expect(result.peak).toBeLessThan(0.9);
    await effects.getByRole("checkbox", { name: piece.name, exact: true }).check();
    const slider = effects.getByRole("slider", { name: `${piece.name} volume`, exact: true });
    await slider.fill("0.35");
    await expect.poll(() => page.evaluate(slug => JSON.parse(localStorage.getItem("ss_profile") ?? "{}").effectVolumes?.[slug], piece.slug)).toBe(0.35);
  }
  await expect(effects.getByRole("link")).toHaveCount(0);
  await page.reload();
  for(const piece of pieces) {
    await expect(effects.getByRole("checkbox", { name: piece.name, exact: true })).toBeChecked();
    await expect(effects.getByRole("slider", { name: `${piece.name} volume`, exact: true })).toHaveValue("0.35");
  }
});
