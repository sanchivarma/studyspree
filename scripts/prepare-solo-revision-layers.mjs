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
  ["garden-cascade-v9", '<defs><linearGradient id="water" x1="0" y1="426" x2="0" y2="486" gradientUnits="userSpaceOnUse"><stop stop-color="#aaa"/><stop offset="0.75" stop-color="#888"/><stop offset="1" stop-color="black"/></linearGradient></defs><path d="M621 427Q624 430 625 438L627 479 625 485 620 484 619 439Z M679 428L685 428Q684 452 686 477L688 485 681 485Q680 452 679 428Z" fill="url(#water)"/>', 1],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="black"/>${shape}</svg>`;
  await sharp(Buffer.from(svg)).blur(blur).png().toFile(`.tmp/solo-revisions/${name}-mask.png`);
}

// A modest increase in falling-water visibility; keep its feathered boundaries.
await sharp(".tmp/solo-revisions/garden-cascade-v9-mask.png").linear(1.35)
  .png().toFile(".tmp/solo-revisions/garden-cascade-v10-mask.png");

// Strengthen only the photographed sky mask, retaining all castle geometry.
await sharp(".tmp/solo-filmed/academy-sky-mask-v2.png").linear(2.1)
  .png().toFile(".tmp/solo-revisions/academy-sky-v8-mask.png");
