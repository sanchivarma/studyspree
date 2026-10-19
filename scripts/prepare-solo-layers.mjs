import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Preparation only. Runtime scenes use pre-encoded local files, never canvases.
await mkdir(".tmp/solo-filmed", { recursive: true });
const mattes = {
  "academy-sky": { colour: "#555", points: "360,0 1000,0 1000,160 970,180 940,190 920,180 900,200 870,200 830,180 800,160 780,150 760,170 740,150 720,140 700,150 690,170 660,190 640,210 620,180 600,190 580,200 560,200 540,210 520,220 500,230 470,210 440,190 420,175 400,175 380,170 360,150" },
  "ship-water": { colour: "#888", points: "120,680 280,640 430,580 550,530 680,550 780,630 880,660 840,800 740,880 580,940 250,920 120,810" },
};
for (const [name, { colour, points }] of Object.entries(mattes)) {
  // Normalised coordinates must fill the output; default SVG letterboxing
  // would put the matte in the wrong place and cover stationary architecture.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1000 1000" preserveAspectRatio="none"><rect width="1000" height="1000" fill="black"/><polygon fill="${colour}" points="${points}"/></svg>`;
  await sharp(Buffer.from(svg)).blur(28).png().toFile(`.tmp/solo-filmed/${name}-mask-v2.png`);
}
