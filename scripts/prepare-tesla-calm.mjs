import sharp from "sharp";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Keep Tesla's face/cage/lighting fixed. Animate the nearby writing poses,
// rather than interpolating the original sheet's large head turns.
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const destination = fileURLToPath(new URL("../public/characters/tesla/", import.meta.url));
const outputs = ["study-v5.gif", "poster-v5.webp", "study-v5.mp4", "study-v5.webm"];
for (const name of outputs) {
  try { await access(join(destination, name)); throw new Error(`Immutable asset exists: ${name}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const sheet = fileURLToPath(new URL("../docs/historical-companions/tesla-sheet.png", import.meta.url));
const { width, height } = await sharp(sheet).metadata();
const crop = async index => {
  const left = Math.round(index * width / 4), right = Math.round((index + 1) * width / 4);
  return sharp(sheet).extract({ left: left + 2, top: 2, width: right - left - 4, height: Math.round(height / 4) - 4 }).resize(320, 240).png().toBuffer();
};
const base = await crop(0);
// A feathered hand/pen region leaves the rest of the original art stationary.
const mask = Buffer.from('<svg width="320" height="240"><defs><filter id="soft"><feGaussianBlur stdDeviation="3"/></filter></defs><rect x="39" y="156" width="104" height="59" rx="12" fill="white" filter="url(#soft)"/></svg>');
const work = await mkdtemp(join(tmpdir(), "studyspree-tesla-calm-"));
// Duplicate the initial pose for the interpolator's lookahead, so playback
// begins and finishes on the same resting writing pose.
const sequence = [0, 0, 1, 3, 1, 0, 0, 0];
for (const [index, pose] of sequence.entries()) {
  const patch = await sharp(await crop(pose)).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  await sharp(base).composite([{ input: patch }]).png().toFile(join(work, `${String(index).padStart(2, "0")}.png`));
}
const run = args => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit", windowsHide: true });
run(["-framerate", "0.25", "-i", join(work, "%02d.png"), "-vf", "minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1:scd=none,setpts=PTS-STARTPTS,trim=duration=10,split[forward][reverse];[reverse]reverse[back];[forward][back]concat=n=2:v=1:a=0", "-t", "20", "-an", "-c:v", "libx264", "-crf", "0", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-n", join(work, "study-v5.mp4")]);
run(["-i", join(work, "study-v5.mp4"), "-vf", "fps=20,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle", "-loop", "0", "-n", join(work, "study-v5.gif")]);
run(["-i", join(work, "study-v5.mp4"), "-an", "-c:v", "libvpx-vp9", "-lossless", "1", "-b:v", "0", "-n", join(work, "study-v5.webm")]);
await sharp(base).webp({ quality: 88 }).toFile(join(work, "poster-v5.webp"));
const gif = await readFile(join(work, "study-v5.gif"));
const metadata = await sharp(gif, { animated: true }).metadata();
if (gif.length > 2 * 1024 * 1024 || metadata.loop !== 0 || metadata.delay.reduce((sum, ms) => sum + ms, 0) !== 20000) throw new Error(`Unexpected GIF budget/duration: ${gif.length} bytes`);
await mkdir(destination, { recursive: true });
for (const name of outputs) {
  const bytes = await readFile(join(work, name));
  if (bytes.length > 8000000) throw new Error(`${name}: exceeds asset budget`);
  await writeFile(join(destination, name), bytes, { flag: "wx" });
  console.log(`${name}: ${bytes.length} bytes`);
}
console.log(`Tesla calm loop: ${metadata.pages} GIF frames, 20 seconds; 30fps runtime video`);
