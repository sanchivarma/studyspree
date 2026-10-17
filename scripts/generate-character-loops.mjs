// Original vector illustrations and animation authored for StudySpree.
// Uses sharp already installed with Next.js; no downloaded artwork or likenesses.
import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const root = fileURLToPath(new URL("../public/characters/", import.meta.url));
export const cast = [
  ["male-01", "#be8566", "#25242c", "#648f99", "short", false, "reading"],
  ["male-02", "#805039", "#211b22", "#b37a5c", "curls", true, "writing"],
  ["male-03", "#e7b491", "#664536", "#86956e", "sweep", true, "reading"],
  ["male-04", "#ac7050", "#242429", "#8c7b9c", "bun", false, "writing"],
  ["female-01", "#e2ae8d", "#4b302d", "#a87d85", "bob", true, "reading"],
  ["female-02", "#89563f", "#241c25", "#7489aa", "curls", false, "writing"],
  ["female-03", "#c88f68", "#32282d", "#ac945e", "long", true, "reading"],
  ["female-04", "#e9c0a0", "#a55d39", "#73988a", "bun", false, "writing"],
];

export function illustration(person, frame, seconds = null) {
  const [slug, skin, hair, shirt, style, glasses, activity] = person;
  const phase = frame / 32 * Math.PI * 2;
  const breath = (Math.sin(phase) * 1.3).toFixed(2);
  const pen = (Math.sin(phase * 3) * 3).toFixed(2);
  const blink = seconds === null ? frame === 12 || frame === 13 : seconds % 5.7 < 0.16 || seconds % 17.3 < 0.12;
  const look = seconds === null ? 0 : Math.sin(seconds * Math.PI / 25) * 1.5;
  const pageTurn = seconds !== null && seconds % 37 > 29 && seconds % 37 < 31;
  const eye = blink ? "M-22 4h8 M14 4h8" : "M-22 2q4 4 8 0 M14 2q4 4 8 0";
  const backHair = ["long", "bob", "curls"].includes(style)
    ? `<path d="M-50-33Q-69 10-58 84Q0 111 59 82L50-35Z" fill="${hair}"/>` : "";
  const topHair = style === "curls"
    ? `<path d="M-47-11Q-67-29-48-45Q-51-62-32-63Q-29-81-10-69Q7-86 21-68Q44-78 48-54Q72-42 52-16L43-4L37-34Q0-22-35-34L-40 2Z" fill="${hair}"/>`
    : `<path d="M-48-2Q-64-63-6-67Q52-72 51-14L42 4L34-31Q8-17-18-40Q-27-18-43-16Z" fill="${hair}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
  <defs><linearGradient id="room" x2="1" y2="1"><stop stop-color="#242c3d"/><stop offset="1" stop-color="#151c2a"/></linearGradient><radialGradient id="glow"><stop stop-color="#efba78" stop-opacity=".16"/><stop offset="1" stop-color="#efba78" stop-opacity="0"/></radialGradient></defs>
  <rect width="480" height="360" fill="url(#room)"/>
  <rect x="27" y="25" width="136" height="175" rx="16" fill="#111c30" stroke="#3f4c62" stroke-width="5"/>
  <path d="M95 28v170M29 111h132" stroke="#3f4c62" stroke-width="4"/>
  <circle cx="130" cy="58" r="15" fill="#e0d6bb"/><circle cx="137" cy="53" r="15" fill="#111c30"/>
  <path d="M45 57h2m17 87h2m72 17h2M118 89h2M51 177h2" stroke="#c1cedd" stroke-width="2"/>
  <rect x="329" y="53" width="121" height="7" rx="3" fill="#8a715c"/>
  <path d="M343 52V23h13v29m7 0V16h12v36m7 0V25h16v27" fill="${shirt}"/>
  <path d="M418 51q-8-18 1-27q14 12 0 27m0-8q9-20 20-14q-1 18-20 14" fill="#7d997c"/>
  <ellipse cx="245" cy="330" rx="175" ry="19" fill="#101623"/>
  <path d="M169 304V199Q240 165 312 199V304" fill="#343b4b"/>
  <g transform="translate(240 ${177 + Number(breath)}) rotate(${look})">
  ${backHair}
  <path d="M-23 34v39h46V34" fill="${skin}"/>
  <path d="M-23 49q23 17 46 0v10q-22 17-46 0" fill="#000" opacity=".1"/>
  <path d="M-23 65Q-67 66-80 103l-16 48h192l-16-48Q67 66 23 65L0 86Z" fill="${shirt}"/>
  <path d="M-24 66L0 86l24-20" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="4"/>
  <ellipse cx="-47" cy="0" rx="9" ry="13" fill="${skin}"/><ellipse cx="47" cy="0" rx="9" ry="13" fill="${skin}"/>
  <path d="M-45-27Q0-72 45-27L42 25Q35 55 0 60Q-35 55-42 25Z" fill="${skin}"/>
  ${topHair}
  ${style === "bun" ? `<circle cx="36" cy="-66" r="20" fill="${hair}"/>` : ""}
  ${style === "sweep" ? `<path d="M-45-20Q-8-73 47-37Q25-39-12-8Z" fill="${hair}"/>` : ""}
  ${slug === "male-02" || slug === "male-04" ? `<path d="M-31 29Q0 63 31 29L23 48Q0 66-23 48Z" fill="${hair}" opacity=".45"/>` : ""}
  <path d="${eye}" fill="none" stroke="#30252b" stroke-width="3" stroke-linecap="round"/>
  <path d="M0 7l-4 14h7M-10 32q10 6 20 0" fill="none" stroke="#704e45" stroke-width="2" stroke-linecap="round"/>
  ${glasses ? `<g fill="none" stroke="#403c45" stroke-width="2.5"><rect x="-33" y="-5" width="26" height="19" rx="7"/><rect x="7" y="-5" width="26" height="19" rx="7"/><path d="M-7 2h14M-43-2l10 3m66 0 10-3"/></g>` : ""}
  </g>
  <path d="M0 305Q240 295 480 305v55H0Z" fill="#765d4d"/>
  <path d="M0 314h480" stroke="#a4896b" stroke-opacity=".5"/>
  <ellipse cx="240" cy="318" rx="103" ry="10" fill="#493f3a" opacity=".6"/>
  <path d="M140 301l17-39q44-3 83 12q39-15 83-12l17 39q-52-6-100 10q-48-16-100-10Z" fill="#e4d7bb" stroke="#baa584" stroke-width="2"/>
  <path d="M240 275v31m-72-31q28 0 57 9m-60 0q28 0 60 9m31-9q29-9 57-9m-57 18q31-9 60-9" stroke="#a79983" fill="none" stroke-width="2"/>
  ${pageTurn ? `<path d="M240 276q${38 * Math.sin((seconds % 37 - 29) * Math.PI / 2)}-55 78-15l-8 40-70 7Z" fill="#eee3cb" stroke="#baa584" stroke-width="1.5"/>` : ""}
  <path d="M170 268q-15 9-25 20q14 9 35-1l18-9M310 268q15 9 25 20q-14 9-35-1l-18-9" fill="${skin}"/>
  ${activity === "writing" ? `<g transform="translate(${pen} 0)"><path d="M286 280l-10-27" stroke="#2a333e" stroke-width="5" stroke-linecap="round"/><path d="M284 279l3 7" stroke="#dbc9a9" stroke-width="2"/><ellipse cx="286" cy="277" rx="8" ry="5" fill="${skin}"/></g>` : `<path d="M242 277q${20 + Math.sin(phase) * 4} -18 65-8" stroke="#f2e8d4" stroke-width="2" fill="none"/>`}
  <path d="M370 309v-30h28v30q-14 6-28 0" fill="${shirt}"/><path d="M399 283q19 0 9 15h-9" fill="none" stroke="${shirt}" stroke-width="5"/>
  <path d="M382 ${270 + Math.sin(phase) * 2}q-7-8 1-14" stroke="#d8c8ad" opacity=".3" stroke-width="2" fill="none"/>
  <circle cx="379" cy="213" r="110" fill="url(#glow)"/>
  </svg>`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
await mkdir(root, { recursive: true });
for (const person of cast) {
  const dir = join(root, person[0]);
  await mkdir(dir, { recursive: true });
  const gif = join(dir, "study-v1.gif");
  try { await access(gif); console.log(`${person[0]}: immutable v1 exists; preserved`); continue; } catch { /* New asset. */ }
  const frames = [];
  for (let frame = 0; frame < 32; frame++) {
    frames.push(await sharp(Buffer.from(illustration(person, frame))).ensureAlpha().raw().toBuffer());
  }
  // One tall raw image with pageHeight encodes independent animation frames.
  const animation = await sharp(Buffer.concat(frames), {
    raw: { width: 480, height: 360 * frames.length, channels: 4, pageHeight: 360 },
  }).gif({ loop: 0, delay: Array(32).fill(150), colours: 128, effort: 7 }).toBuffer();
  await writeFile(gif, animation);
  await sharp(Buffer.from(illustration(person, 0))).webp({ quality: 85 }).toFile(join(dir, "poster-v1.webp"));
  console.log(`${person[0]}: ${animation.length} bytes`);
}
}
