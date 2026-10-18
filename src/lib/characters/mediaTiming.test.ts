import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import media from "./mediaRevisions.json";
import { getCharacter } from "./registry";

const timed = Object.entries(media).filter(([, value]) => value.version === "v11");
describe("active companion reading timing", () => {
  it("uses distinct 15–20 second reading holds and distinct repeat periods", () => {
    expect(timed).toHaveLength(15);
    const pauses = new Set<number>(), periods = new Set<number>();
    for (const [slug, value] of timed) {
      expect("readingPauseMs" in value).toBe(true);
      if (!("readingPauseMs" in value)) throw new Error("Timing metadata missing");
      expect(value.readingPauseMs).toBeGreaterThanOrEqual(15000);
      expect(value.readingPauseMs).toBeLessThanOrEqual(20000);
      pauses.add(value.readingPauseMs); periods.add(value.loopSeconds);
      expect(getCharacter(slug)?.gif).toBe(`/characters/${slug}/study-v11.gif`);
    }
    expect(pauses.size).toBe(timed.length); expect(periods.size).toBe(timed.length);
  });
  it("encodes those actual delays and slows existing actions without changing frame count or source", async () => {
    for (const [slug, value] of timed) {
      if (!("sourceVersion" in value)) throw new Error("Source metadata missing");
      const original = await readFile(`public/characters/${slug}/study-${value.sourceVersion}.gif`);
      expect(createHash("sha256").update(original).digest("hex")).toBe(value.sourceSha256);
      const source = await sharp(original, { animated: true }).metadata();
      const result = await sharp(`public/characters/${slug}/study-v11.gif`, { animated: true }).metadata();
      expect(result.pages).toBe(source.pages); expect(result.width).toBe(source.width); expect(result.pageHeight).toBe(source.pageHeight);
      expect(result.delay).toEqual(value.gifDelays);
      expect(result.delay![0]).toBe(value.readingPauseMs);
      expect(result.loop).toBe(0);
      for (let frame = 1; frame < source.pages!; frame++) expect(result.delay![frame]).toBe(Math.round(source.delay![frame] * 1.5 / 10) * 10);
    }
  });
});
