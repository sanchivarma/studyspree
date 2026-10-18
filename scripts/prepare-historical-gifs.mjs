import sharp from "sharp";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Original generated source frames, with local motion compensation. These
// five-second GIFs are not continuous multi-minute source video.
const manifest = JSON.parse(await readFile(new URL("../docs/historical-companions/sources.json", import.meta.url), "utf8"));
const wanted = new Set(process.argv.slice(2));
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
try { execFileSync(ffmpeg, ["-version"], { stdio: "ignore" }); }
catch { throw new Error("Install FFmpeg or set FFMPEG_PATH to prepare the expanded GIF cast."); }
for (const item of manifest) {
  if (wanted.size && !wanted.has(item.slug)) continue;
  if (!["medieval-scholar", "medieval-scribe", "einstein", "tesla"].includes(item.slug)) throw new Error("Unknown historical partner");
  const directory = fileURLToPath(new URL(`../public/characters/${item.slug}/`, import.meta.url));
  for (const file of ["study-v1.gif", "poster-v1.webp"]) {
    try { await access(join(directory, file)); throw new Error(`${item.slug}/${file}: immutable asset already exists`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const work = await mkdtemp(join(tmpdir(), "studyspree-expanded-"));
  const sheet = fileURLToPath(new URL(`../docs/historical-companions/${item.sheet}`, import.meta.url));
  const { width, height } = await sharp(sheet).metadata();
  for (let frame = 0; frame < 16; frame++) {
    const column = frame % 4, row = Math.floor(frame / 4);
    const left = Math.round(column * width / 4), top = Math.round(row * height / 4);
    const right = Math.round((column + 1) * width / 4), bottom = Math.round((row + 1) * height / 4);
    await sharp(sheet).extract({ left: left + 2, top: top + 2, width: right - left - 4, height: bottom - top - 4 })
      .resize(360, 270).png().toFile(join(work, `${String(frame).padStart(2, "0")}.png`));
  }
  const run = args => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
  run(["-framerate", "3.2", "-i", join(work, "%02d.png"), "-vf", "minterpolate=fps=25:mi_mode=mci:mc_mode=aobmc:vsbmc=1:scd=none,tpad=stop_mode=clone:stop_duration=0.65", "-an", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-n", join(work, "motion.mp4")]);
  run(["-i", join(work, "motion.mp4"), "-vf", `fps=20,scale=320:240,split[a][b];[a]palettegen=max_colors=${item.slug === "tesla" ? 32 : 96}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=${item.slug === "tesla" ? 5 : 4}:diff_mode=rectangle`, "-loop", "0", "-n", join(work, "study.gif")]);
  const gif = await readFile(join(work, "study.gif"));
  const metadata = await sharp(gif, { animated: true }).metadata();
  if (gif.length > 2 * 1024 * 1024 || metadata.pages < 90 || metadata.delay.some(delay => delay !== 50)) throw new Error(`${item.slug}: unexpected GIF size or cadence: ${gif.length} bytes, ${metadata.pages} frames, delays ${[...new Set(metadata.delay)]}`);
  const poster = await sharp(join(work, "00.png")).resize(320, 240).webp({ quality: 88 }).toBuffer();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "study-v1.gif"), gif, { flag: "wx" });
  await writeFile(join(directory, "poster-v1.webp"), poster, { flag: "wx" });
  console.log(`${item.slug}: ${gif.length} bytes; ${metadata.pages} frames; ${metadata.delay.reduce((sum, value) => sum + value, 0) / 1000}s; 20fps`);
}
