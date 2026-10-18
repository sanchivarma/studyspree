import { expect, it } from "vitest";
import sharp from "sharp";

it("keeps scientist backgrounds fixed while the native writing area changes", async () => {
  for (const slug of ["einstein", "tesla"]) {
    const metadata = await sharp(`public/characters/${slug}/study-v14.gif`, { animated: true }).metadata();
    const raw = await sharp(`public/characters/${slug}/study-v14.gif`, { animated: true }).ensureAlpha().raw().toBuffer();
    const width = metadata.width!, height = metadata.pageHeight!, stride = width * height * 4;
    let backgroundDifference = 0, backgroundSamples = 0, writingDifference = 0;
    for (let frame = 1; frame < metadata.pages!; frame += 7) {
      for (let y = 0; y < height; y += 5) for (let x = 0; x < width; x += 5) {
        const pixel = (y * width + x) * 4;
        const difference = Math.abs(raw[pixel] - raw[frame * stride + pixel]);
        if (y < 135 || x > 230) { backgroundDifference += difference; backgroundSamples++; }
        else writingDifference += difference;
      }
    }
    expect(backgroundDifference / backgroundSamples, slug).toBeLessThan(0.5);
    expect(writingDifference, slug).toBeGreaterThan(10);
  }
});

it("adds slow background movement with a steady foreground and a quiet seam", async () => {
  for (const slug of ["einstein", "tesla"]) {
    const metadata = await sharp(`public/characters/${slug}/study-v30.gif`, { animated: true }).metadata();
    const raw = await sharp(`public/characters/${slug}/study-v30.gif`, { animated: true }).ensureAlpha().raw().toBuffer();
    const width = metadata.width!, stride = width * metadata.pageHeight! * 4;
    const difference = (a: number, b: number, left: number, right: number) => {
      let total = 0, count = 0;
      for (let y = 0; y < 135; y += 3) for (let x = left; x < right; x += 3) {
        const pixel = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) { total += Math.abs(raw[a*stride+pixel+channel]-raw[b*stride+pixel+channel]); count++; }
      }
      return total/count;
    };
    expect(difference(0,65,0,205), slug).toBeLessThan(1);
    if(slug === "tesla") {
      expect(difference(0,9,215,320), "short coil discharge").toBeGreaterThan(0.02);
      expect(difference(0,16,215,320), "discharge has ended within 400ms").toBeLessThan(0.5);
    } else expect(difference(0,65,215,320), slug).toBeGreaterThan(0.02);
    expect(difference(0,65,215,320), slug).toBeLessThan(8);
    expect(difference(65,66,215,320), slug).toBeLessThan(0.5);
    expect(difference(0,259,215,320), slug).toBeLessThan(0.5);
  }
});
