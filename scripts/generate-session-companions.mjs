import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { cast, illustration } from "./generate-character-loops.mjs";

export function whimsical(slug, seconds) {
  const phase = seconds * Math.PI / 2;
  const blink = seconds % 6 < 0.2;
  const eyes = blink ? '<path d="M-30 0h12m36 0h12" stroke="#3a3342" stroke-width="5" stroke-linecap="round"/>' : '<ellipse cx="-24" cy="0" rx="5" ry="7" fill="#3a3342"/><ellipse cx="24" cy="0" rx="5" ry="7" fill="#3a3342"/>';
  const figure = slug === "moss-fox" ? '<path d="M-70-20l-7-75 53 39M70-20l7-75-53 39" fill="#d99b68"/><ellipse rx="77" ry="65" fill="#d99b68"/><path d="M-62 5Q-30-5 0 30Q30-5 62 5Q52 61 0 61Q-52 61-62 5" fill="#f0ddbe"/>'
    : slug === "pip-owl" ? '<path d="M-74-40l5-44 35 21Q0-76 35-63l35-21 4 44v63Q0 102-74 23Z" fill="#9c9aac"/><ellipse cx="-31" rx="32" ry="39" fill="#e9ddc4"/><ellipse cx="31" rx="32" ry="39" fill="#e9ddc4"/>'
    : '<path d="M-69 32Q-104 22-83-13Q-93-52-52-55Q-29-91 7-65Q45-81 62-49Q107-43 92-8Q105 27 66 36Z" fill="#e9e1f0"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#293e43"/><stop offset="1" stop-color="#1c2735"/></linearGradient></defs><rect width="480" height="360" fill="url(#bg)"/><circle cx="385" cy="64" r="25" fill="#e9c991" opacity=".55"/><path d="M25 35h115v165H25Z" fill="#1b3343"/><path d="M82 35v165M25 112h115" stroke="#5d797e" stroke-width="5"/><path d="M355 210q-18-39 6-54 15 32-6 54m0-7q30-42 46-16-12 27-46 16" fill="#7c9b85"/><path d="M335 215h45l-9 43h-27Z" fill="#bd997d"/><g transform="translate(240 ${180 + Math.sin(phase) * 1.5})"><ellipse cy="79" rx="78" ry="76" fill="${slug === "moss-fox" ? "#b47854" : slug === "pip-owl" ? "#848398" : "#b9afca"}"/>${figure}${eyes}<path d="M-5 16h10L0 23Z" fill="#65505e"/><ellipse cx="-44" cy="15" rx="10" ry="5" fill="#e5aa9e" opacity=".6"/><ellipse cx="44" cy="15" rx="10" ry="5" fill="#e5aa9e" opacity=".6"/></g><path d="M0 307h480v53H0Z" fill="#806451"/><path d="M145 295l15-42q45-5 80 12 35-17 80-12l15 42q-53-8-95 11-42-19-95-11Z" fill="#e6d9bc" stroke="#b4a186" stroke-width="2"/><path d="M240 267v36m-71-35 58 10m-60 1 60 10m27-10 58-10m-58 20 58-10" fill="none" stroke="#ac9b7f" stroke-width="2"/><ellipse cx="158" cy="281" rx="18" ry="10" fill="${slug === "moss-fox" ? "#d99b68" : slug === "pip-owl" ? "#9c9aac" : "#e9e1f0"}"/><ellipse cx="322" cy="281" rx="18" ry="10" fill="#bbabbd"/><path d="M380 278v29q16 8 30 0v-29Z" fill="#a6bdad"/><path d="M410 282q19-1 14 15h-14" stroke="#a6bdad" stroke-width="5" fill="none"/></svg>`;
}

const root = fileURLToPath(new URL("../public/characters/", import.meta.url));
const whimsicalSlugs = ["moss-fox", "pip-owl", "momo-cloud"];
const targets = [...cast.map(person => person[0]), ...whimsicalSlugs];
for (const slug of targets) {
  try { await access(join(root, slug, "study-v2.webm")); throw new Error(`${slug}: immutable v2 exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
for (const slug of whimsicalSlugs) {
  const directory = join(root, slug); await mkdir(directory, { recursive: true });
  const frames = [];
  for (let n = 0; n < 32; n++) frames.push(await sharp(Buffer.from(whimsical(slug, n / 8))).ensureAlpha().raw().toBuffer());
  const gif = await sharp(Buffer.concat(frames), { raw: { width: 480, height: 360 * frames.length, channels: 4, pageHeight: 360 } }).gif({ loop: 0, delay: Array(32).fill(125), colours: 96 }).toBuffer();
  await writeFile(join(directory, "study-v1.gif"), gif, { flag: "wx" });
  await sharp(Buffer.from(whimsical(slug, 0))).webp({ quality: 85 }).toFile(join(directory, "poster-v1.webp"));
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: `window.drawPerson=${illustration.toString()};window.drawWhimsy=${whimsical.toString()};` });
  // One wall-clock recording, eleven independent canvases. No short clip is repeated
  // to simulate a longer duration: reading/posture/page-turn states span 150 seconds.
  const result = await page.evaluate(async ({ cast, whimsicalSlugs }) => {
    const definitions = [...cast.map(person => ({ slug: person[0], person })), ...whimsicalSlugs.map(slug => ({ slug }))];
    const tracks = [];
    for (const definition of definitions) {
      const canvas = document.createElement("canvas"); canvas.width = 480; canvas.height = 360;
      const context = canvas.getContext("2d"); const stream = canvas.captureStream(6);
      const recordings = ["video/webm;codecs=vp9", "video/mp4;codecs=avc1.42001E"].map(type => {
        if (!MediaRecorder.isTypeSupported(type)) throw new Error(`Encoder unavailable: ${type}`);
        const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 240000 }); const chunks = [];
        const done = new Promise(resolve => { recorder.ondataavailable = e => chunks.push(e.data); recorder.onstop = async () => resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))); });
        return { recorder, done };
      });
      tracks.push({ ...definition, canvas, context, stream, recordings, image: new Image() });
    }
    async function paint(seconds) {
      await Promise.all(tracks.map(async track => {
        const svg = track.person ? window.drawPerson(track.person, seconds / 4 * 32, seconds) : window.drawWhimsy(track.slug, seconds);
        track.image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`; await track.image.decode(); track.context.drawImage(track.image, 0, 0);
      }));
    }
    await paint(0); tracks.forEach(track => track.recordings.forEach(recording => recording.recorder.start()));
    const start = performance.now(); let painting = false;
    const interval = setInterval(() => { if (painting) return; painting = true; paint((performance.now() - start) / 1000).finally(() => { painting = false; }); }, 160);
    await new Promise(resolve => setTimeout(resolve, 150000)); clearInterval(interval);
    const output = [];
    for (const track of tracks) {
      track.recordings.forEach(recording => recording.recorder.stop());
      output.push({ slug: track.slug, webm: await track.recordings[0].done, mp4: await track.recordings[1].done });
      track.stream.getTracks().forEach(t => t.stop());
    }
    return output;
  }, { cast, whimsicalSlugs });
  for (const item of result) for (const format of ["webm", "mp4"]) {
    const bytes = Buffer.from(item[format]); if (bytes.length > 8000000) throw new Error(`${item.slug}: exceeds 8 MB`);
    await writeFile(join(root, item.slug, `study-v2.${format}`), bytes, { flag: "wx" }); console.log(`${item.slug}/study-v2.${format}: ${bytes.length} bytes`);
  }
} finally { await browser.close(); }
