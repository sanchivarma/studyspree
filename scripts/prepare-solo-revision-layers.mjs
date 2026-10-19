import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Preparation-time mattes only; architecture and people are never displaced.
await mkdir(".tmp/solo-revisions", { recursive: true });
for (const [name, shape, blur] of [
  ["garden-sky", '<path d="M300 0H1120V150L1060 185 990 190 920 185 830 200 700 208 570 215 450 195 300 180Z" fill="#555"/>', 10],
  ["garden-water", '<ellipse cx="650" cy="484" rx="63" ry="8" fill="#999"/><rect x="648" y="376" width="5" height="46" rx="2" fill="#555"/>', 2],
  ["ship-water", '<path d="M560 345H840V430L900 470 920 560 790 630H440V500L500 420Z" fill="#888"/>', 12],
  ["garden-sky-v8", '<path d="M300 0H1120V150L1060 185 990 190 920 185 830 200 700 208 570 215 450 195 300 180Z" fill="#999"/>', 10],
  ["garden-basin-v8", '<ellipse cx="650" cy="484" rx="63" ry="8" fill="#bbb"/>', 2],
  ["garden-cascade-v8", '<path d="M621 427L627 429 629 472 622 472Z M678 429L685 427 684 470 677 470Z" fill="#eee"/>', 0.9],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="black"/>${shape}</svg>`;
  await sharp(Buffer.from(svg)).blur(blur).png().toFile(`.tmp/solo-revisions/${name}-mask.png`);
}

// Strengthen only the photographed sky mask, retaining all castle geometry.
await sharp(".tmp/solo-filmed/academy-sky-mask-v2.png").linear(2.1)
  .png().toFile(".tmp/solo-revisions/academy-sky-v8-mask.png");
