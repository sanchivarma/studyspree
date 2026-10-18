import sharp from "sharp";
import { expect, it } from "vitest";

it("keeps the preserved background outside revised Tesla electricity, sweater and resting hand steady while the writing hand moves", async () => {
  for (const slug of ["einstein", "tesla"]) {
    const path = `public/characters/${slug}/study-v27.gif`;
    const metadata = await sharp(path, { animated: true }).metadata();
    const raw = await sharp(path, { animated: true }).ensureAlpha().raw().toBuffer();
    const approved = await sharp(`public/characters/${slug}/study-v20.gif`, { animated: true }).ensureAlpha().raw().toBuffer();
    const width = metadata.width!, stride = width * metadata.pageHeight! * 4;
    const bounds = slug === "einstein" ? [65,130,205,210] : [45,140,215,215];
    let outside = 0, outsideSamples = 0, coat = 0, coatSamples = 0, hand = 0, handSamples = 0;
    for (const frame of [13,39,65,91,117,143,169,195,221,247]) {
      for (let y=0;y<metadata.pageHeight!;y+=2) for(let x=0;x<width;x+=2) {
        const pixel = (y*width+x)*4;
        for(let channel=0;channel<3;channel++) {
          const current=raw[frame*stride+pixel+channel];
          if((x<bounds[0]||x>=bounds[2]||y<bounds[1]||y>=bounds[3]) && !(slug === "tesla" && x>=205 && y<135)) { outside+=Math.abs(current-approved[frame*stride+pixel+channel]);outsideSamples++; }
          if(x>=140&&x<180&&y>=135&&y<150) { coat+=Math.abs(current-raw[pixel+channel]);coatSamples++; }
          if(x>=85&&x<120&&y>=155&&y<195) { hand+=Math.abs(current-raw[pixel+channel]);handSamples++; }
        }
      }
    }
    expect(outside/outsideSamples, `${slug}: approved background`).toBeLessThan(0.8);
    expect(coat/coatSamples, `${slug}: steady clothing`).toBeLessThan(0.8);
    expect(hand/handSamples, `${slug}: visible writing`).toBeGreaterThan(0.5);
    expect(metadata.delay).toEqual(Array(260).fill(50));
    expect(metadata.loop).toBe(0);
  }
});
