import sharp from "sharp";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const slugs = [...["male", "female"].flatMap(gender => [1, 2, 3, 4].map(n => `${gender}-0${n}`)), "moss-fox", "pip-owl", "momo-cloud"];
for (const slug of slugs) {
  const directory = join("public/characters", slug);
  if (process.argv.includes("--resume")) {
    const complete = await Promise.all(["study-v3.gif", "study-v3.mp4", "study-v3.webm"].map(file => access(join(directory, file)).then(() => true, () => false)));
    if (complete.every(Boolean)) { console.log(`${slug}: existing immutable outputs retained`); continue; }
  }
  for (const file of ["study-v3.gif", "study-v3.mp4", "study-v3.webm"]) {
    try { await access(join(directory, file)); throw new Error(`Immutable asset exists: ${slug}/${file}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const work = await mkdtemp(join(tmpdir(), "studyspree-illustrated-motion-"));
  const run = args => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit", windowsHide: true });
  // The original authored 150-second recording is preserved. Interpolate its
  // sparse six-fps captures instead of merely relabelling the frame rate.
  run(["-i", join(directory, "study-v2.mp4"), "-vf", "scale=320:240,framerate=fps=30:scene=100", "-t", "150", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-n", join(work, "study-v3.mp4")]);
  run(["-i", join(work, "study-v3.mp4"), "-an", "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "6", "-crf", "35", "-b:v", "0", "-n", join(work, "study-v3.webm")]);
  run(["-ignore_loop", "1", "-i", join(directory, "study-v1.gif"), "-vf", "scale=320:240,minterpolate=fps=20:scd=none,tpad=stop_mode=clone:stop_duration=1,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=5", "-t", "4", "-final_delay", "5", "-loop", "0", "-n", join(work, "study-v3.gif")]);
  let gif = await readFile(join(work, "study-v3.gif"));
  let info = await sharp(gif, { animated: true }).metadata();
  if (info.delay.some(delay => delay !== 50) && info.delay.every(delay => delay % 50 === 0)) {
    // GIF muxers coalesce identical held frames. Expand those holds explicitly
    // so every preview also carries a uniform twenty-fps cadence.
    const raw = await sharp(gif, { animated: true }).ensureAlpha().raw().toBuffer();
    const stride = info.width * info.pageHeight * 4, frames = [];
    for (let page = 0; page < info.pages; page++) for (let repeat = 0; repeat < info.delay[page] / 50; repeat++) frames.push(raw.subarray(page * stride, (page + 1) * stride));
    gif = await sharp(Buffer.concat(frames), { raw: { width: info.width, height: info.pageHeight * frames.length, pageHeight: info.pageHeight, channels: 4 } }).gif({ loop: 0, delay: Array(frames.length).fill(50), keepDuplicateFrames: true, colours: 96 }).toBuffer();
    info = await sharp(gif, { animated: true }).metadata();
    await writeFile(join(work, "study-v3.gif"), gif);
  }
  if (gif.length > 2 * 1024 * 1024 || info.loop !== 0 || info.delay.some(delay => delay !== 50)) throw new Error(`${slug}: invalid smooth preview ${gif.length} bytes; ${[...new Set(info.delay)]}`);
  for (const file of ["study-v3.gif", "study-v3.mp4", "study-v3.webm"]) {
    const bytes = await readFile(join(work, file));
    if (bytes.length > 8000000) throw new Error(`${slug}/${file}: exceeds 8 MB`);
    await writeFile(join(directory, file), bytes, { flag: "wx" });
  }
  console.log(`${slug}: 30fps 150-second runtime video; ${info.pages} preview frames at 20fps`);
}
