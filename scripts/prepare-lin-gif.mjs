import sharp from "sharp";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Lin's generated sheet has THREE complete columns, plus an unwanted strip.
// Keep the crop explicit. Motion compensation adds intermediate frames;
// it cannot turn a generated sprite sheet into natural source video.
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const directory = fileURLToPath(new URL("../public/characters/realistic-02/", import.meta.url));
for (const file of ["study-v4.gif", "poster-v4.webp"]) {
  try { await access(join(directory, file)); throw new Error(`${file}: immutable asset already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
try { execFileSync(ffmpeg, ["-version"], { stdio: "ignore" }); }
catch { throw new Error("Install FFmpeg or set FFMPEG_PATH to its executable before preparing Lin's GIF."); }
const work = await mkdtemp(join(tmpdir(), "studyspree-lin-"));
const sheet = new URL("../docs/realistic-gifs/realistic-02-sheet.png", import.meta.url);
for (let frame = 0; frame < 12; frame++) {
  await sharp(fileURLToPath(sheet)).extract({ left: frame % 3 * 452 + 2, top: Math.floor(frame / 3) * 271 + 2, width: 448, height: 267 })
    .resize(360, 270).png().toFile(join(work, `${String(frame).padStart(2, "0")}.png`));
}
const run = args => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
run(["-framerate", "2.4", "-i", join(work, "%02d.png"), "-vf", "minterpolate=fps=25:mi_mode=mci:mc_mode=aobmc:vsbmc=1:scd=none,tpad=stop_mode=clone:stop_duration=0.85", "-an", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-n", join(work, "motion.mp4")]);
run(["-i", join(work, "motion.mp4"), "-vf", "fps=20,scale=320:240,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", "-n", join(work, "study.gif")]);
const gif = await readFile(join(work, "study.gif"));
const metadata = await sharp(gif, { animated: true }).metadata();
if (gif.length > 2 * 1024 * 1024 || metadata.pages !== 109 || metadata.delay.some(delay => delay !== 50)) throw new Error("Unexpected GIF size or cadence; inspect the candidate before publishing.");
const poster = await sharp(join(work, "00.png")).resize(320, 240).webp({ quality: 88 }).toBuffer();
await writeFile(join(directory, "study-v4.gif"), gif, { flag: "wx" });
await writeFile(join(directory, "poster-v4.webp"), poster, { flag: "wx" });
console.log(`Lin: ${gif.length} bytes, ${metadata.pages} frames, 20fps, 5.45s loop; source crop corrected.`);
