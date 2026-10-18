import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { roomAudioSchema, silentRoomAudio } from "@/lib/community/roomControls";

it.each([432,528,963])("bundles a continuous, quiet %i Hz ambient loop with the actual named carrier", frequency => {
  const bytes = readFileSync(`public/audio/ambient-${frequency}hz-v1.wav`);
  expect(bytes.toString("ascii",0,4)).toBe("RIFF");
  expect(bytes.toString("ascii",8,12)).toBe("WAVE");
  const rate = bytes.readUInt32LE(24), count = (bytes.length-44)/2;
  expect(count/rate).toBe(24);
  let peak=0, energy=0, real=0, imaginary=0;
  for(let index=0;index<count;index++) {
    const sample=bytes.readInt16LE(44+index*2)/32768;
    peak=Math.max(peak,Math.abs(sample)); energy+=sample*sample;
    real+=sample*Math.cos(2*Math.PI*frequency*index/rate);
    imaginary+=sample*Math.sin(2*Math.PI*frequency*index/rate);
  }
  expect(Math.sqrt(energy/count)).toBeGreaterThan(0.04);
  expect(peak).toBeLessThan(0.2);
  expect(2*Math.hypot(real,imaginary)/count).toBeGreaterThan(0.075);
  const first=bytes.readInt16LE(44)/32768, last=bytes.readInt16LE(bytes.length-2)/32768;
  expect(Math.abs(first-last)).toBeLessThan(0.03);
  expect(roomAudioSchema.safeParse({ ...silentRoomAudio, backgroundEffects: [`ambient-${frequency}hz`], effectVolumes: { [`ambient-${frequency}hz`]: 0.3 } }).success).toBe(true);
});
