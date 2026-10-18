import { access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Original additive synthesis. No samples, binaural beats or treatment claims.
// Integer/half-integer frequencies and periodic envelopes meet at the loop seam.
const rate = 44100, seconds = 24, samples = rate * seconds;
for (const frequency of [432, 528, 963]) {
  const target = new URL(`../public/audio/ambient-${frequency}hz-v1.wav`, import.meta.url);
  try { await access(target); throw new Error(`Immutable asset exists: ${fileURLToPath(target)}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) {
    const t = index / rate, phase = 2 * Math.PI * frequency * t;
    const envelope = 0.95 + 0.04 * Math.cos(2 * Math.PI * t / seconds);
    const value = envelope * (0.085 * Math.sin(phase) + 0.06 * Math.sin(phase / 2)
      + 0.018 * Math.sin(phase * 1.5) + 0.006 * Math.sin(phase * 2));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  await writeFile(target, buffer);
  console.log(`${frequency} Hz: ${buffer.length} bytes, ${seconds}s seamless mono PCM`);
}
