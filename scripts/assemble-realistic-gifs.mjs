import sharp from "sharp";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";

// Mechanical sprite extraction/encoding. Creative content comes from the
// inspected generated sheets; no user camera, face inference or network I/O.
const manifest = JSON.parse(await readFile(new URL("../docs/realistic-gifs/sources.json", import.meta.url), "utf8"));
const wanted = new Set(process.argv.slice(2));
for (const item of manifest) {
  if (wanted.size && !wanted.has(item.slug)) continue;
  if (item.slug === "realistic-02") {
    console.log("Lin uses the corrected three-column crop and interpolation: run scripts/prepare-lin-gif.mjs.");
    continue;
  }
  const directory = resolve("public/characters", item.slug);
  if (!/^realistic-0[1-8]$/.test(item.slug)) throw new Error("Unknown realistic partner");
  const target = resolve(directory, "study-v3.gif");
  try { await access(target); throw new Error(`${item.slug}: immutable v3 already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const source = await readFile(new URL(`../docs/realistic-gifs/${item.sheet}`, import.meta.url));
  const metadata = await sharp(source).metadata();
  const width = item.activeWidth ?? metadata.width, height = item.activeHeight ?? metadata.height;
  const frames = [];
  for (let n = 0; n < 16; n++) {
    const col = n % 4, row = Math.floor(n / 4);
    const left = Math.round(col * width / 4), top = Math.round(row * height / 4);
    const right = Math.round((col + 1) * width / 4), bottom = Math.round((row + 1) * height / 4);
    const bytes = await sharp(source).extract({ left: left + 2, top: top + 2, width: right - left - 4, height: bottom - top - 4 }).resize(360, 270, { fit: "fill" }).ensureAlpha().raw().toBuffer();
    frames.push(bytes);
  }
  const delay = [700, 180, 180, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 280, 180, 700];
  const gif = await sharp(Buffer.concat(frames), { raw: { width: 360, height: 270 * frames.length, channels: 4, pageHeight: 270 } }).gif({ loop: 0, delay, colours: 160, effort: 7 }).toBuffer();
  if (gif.length > 2 * 1024 * 1024) throw new Error(`${item.slug}: GIF exceeds 2 MiB`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, gif, { flag: "wx" });
  const poster = await sharp(frames[0], { raw: { width: 360, height: 270, channels: 4 } }).webp({ quality: 88 }).toBuffer();
  await writeFile(resolve(directory, "poster-v3.webp"), poster, { flag: "wx" });
  console.log(`${item.slug}: ${gif.length} bytes; 16 frames; ${delay.reduce((sum, value) => sum + value, 0) / 1000}s infinite GIF`);
}
