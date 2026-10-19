import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Preparation-time mattes only; architecture and people are never displaced.
await mkdir(".tmp/solo-revisions", { recursive: true });
for (const [name, shape, blur] of [
  ["garden-sky", '<path d="M300 0H1120V150L1060 185 990 190 920 185 830 200 700 208 570 215 450 195 300 180Z" fill="#555"/>', 10],
  ["garden-water", '<ellipse cx="650" cy="484" rx="63" ry="8" fill="#999"/><rect x="648" y="376" width="5" height="46" rx="2" fill="#555"/>', 2],
  ["ship-water", '<path d="M560 345H840V430L900 470 920 560 790 630H440V500L500 420Z" fill="#888"/>', 12],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="black"/>${shape}</svg>`;
  await sharp(Buffer.from(svg)).blur(blur).png().toFile(`.tmp/solo-revisions/${name}-mask.png`);
}

// Keep the user's preferred v1 composition completely fixed. The mask permits
// native NASA gas luminosity to vary in the accretion disk, never the galaxies,
// black shadow, or the surrounding image. No UV/optical-flow displacement.
const original = ".tmp/solo-revisions/blackhole-original.png";
await sharp(original).webp({ lossless: true }).toFile("public/solo/views/blackhole-art-v7.webp");
const { data, info } = await sharp(original).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const mask = Buffer.alloc(info.width * info.height);
for (let y = 110; y < Math.min(455, info.height); y++) {
  for (let x = 160; x < Math.min(1140, info.width); x++) {
    const i = (y * info.width + x) * info.channels;
    const [r,g,b] = [data[i],data[i+1],data[i+2]];
    if (r > g * 1.04 && g > b * 1.12 && r > 95) mask[y * info.width + x] = 160;
  }
}
await sharp(mask, { raw: { width: info.width, height: info.height, channels: 1 } })
  .blur(3).png().toFile(".tmp/solo-revisions/blackhole-disk-mask.png");
