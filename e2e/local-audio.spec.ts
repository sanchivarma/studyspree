import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { localPreviewAudio } from "../src/lib/audio/localPreview";

for (const [slug, entry] of Object.entries(localPreviewAudio)) test(`local ${slug} serves the exact chosen recording without caching`, async ({ page }) => {
  // Personal/noncommercial files are deliberately neither committed nor sent
  // to CI. This check runs when the owner's local recording is installed.
  const file = `.local/audio/${entry.file}`;
  test.skip(!existsSync(file), "Optional local recording is not installed; production serving is independently denied by unit tests.");
  await page.goto("/login");
  const src = `/api/local-audio/${entry.file}`;
  const response = await page.request.get(src, { maxRetries: 2 });
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(createHash("sha256").update(await response.body()).digest("hex"))
    .toBe(createHash("sha256").update(readFileSync(file)).digest("hex"));
  const signal = await page.evaluate(async src => {
    const buffer = await new OfflineAudioContext(2, 44100, 44100).decodeAudioData(await (await fetch(src)).arrayBuffer());
    const samples = buffer.getChannelData(0); let energy = 0, peak = 0, count = 0;
    for (let index = 0; index < samples.length; index += 64) { const sample = samples[index]; energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); count++; }
    return { duration: buffer.duration, rms: Math.sqrt(energy / count), peak };
  }, src);
  expect(signal.duration).toBeGreaterThan(10); expect(signal.rms).toBeGreaterThan(0.001);
  // Preserve the exact user-selected source, including its original mastering.
  expect(signal.peak).toBeLessThanOrEqual(1);
});
