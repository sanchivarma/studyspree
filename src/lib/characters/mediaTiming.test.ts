import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import media from "./mediaRevisions.json";
import { getCharacter } from "./registry";

const timed = Object.entries(media).filter(([, value]) => "sourceVersion" in value);
describe("active companion timing and source integrity", () => {
  it("matches the active registry and preserves distinct reader onsets", () => {
    expect(timed).toHaveLength(14);
    const readerStarts = new Set<number>();
    for (const [slug, value] of timed) {
      const character = getCharacter(slug)!;
      expect(character.gif).toBe(`/characters/${slug}/study-${value.version}.gif`);
      const pause = Reflect.get(value, "readingPauseMs") as number;
      if (character.activity === "writing") expect(pause).toBe(0);
      else { expect(pause).toBeGreaterThanOrEqual(10000); readerStarts.add(pause); }
    }
    expect(readerStarts.size).toBe(7);
  });
  it("encodes recorded delays with the documented source hashes and frame counts", async () => {
    for (const [slug, value] of timed) {
      if (!("sourceVersion" in value)) throw new Error("Source metadata missing");
      const original = await readFile(`public/characters/${slug}/study-${value.sourceVersion}.gif`);
      expect(createHash("sha256").update(original).digest("hex")).toBe(value.sourceSha256);
      const source = await sharp(original, { animated: true }).metadata();
      const result = await sharp(`public/characters/${slug}/study-${value.version}.gif`, { animated: true }).metadata();
      expect(result.pages).toBe("resampledFrames" in value ? value.gifFrames : source.pages); expect(result.width).toBe(source.width); expect(result.pageHeight).toBe(source.pageHeight);
      expect(result.delay).toEqual(value.gifDelays); expect(result.loop).toBe(0);
      if (getCharacter(slug)?.activity === "writing") expect(Math.max(...result.delay!)).toBeLessThanOrEqual(130);
    }
  });
  it("reverses Arun’s native page-turn frames without mirroring the room", async () => {
    const source = await sharp("public/characters/realistic-01/study-v3.gif", { animated: true }).ensureAlpha().raw().toBuffer();
    const output = await sharp("public/characters/realistic-01/study-v13.gif", { animated: true }).ensureAlpha().raw().toBuffer();
    const stride = 360 * 270 * 4;
    for (let frame = 0; frame < 16; frame++) {
      let difference = 0, samples = 0;
      for (let pixel = 0; pixel < stride; pixel += 16) { difference += Math.abs(source[(15-frame)*stride+pixel] - output[frame*stride+pixel]); samples++; }
      expect(difference / samples).toBeLessThan(2);
    }
  });
});
