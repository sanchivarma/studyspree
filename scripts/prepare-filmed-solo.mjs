import { spawn } from "node:child_process";
import { access, readFile, rename, stat } from "node:fs/promises";

// Usage: node scripts/prepare-filmed-solo.mjs <ffmpeg> <source-manifest.json>
// Source files stay outside public/. Published filenames are immutable.
const [ffmpeg = "ffmpeg", manifest = ".tmp/solo-filmed/render.json"] = process.argv.slice(2);
const entries = JSON.parse(await readFile(manifest, "utf8"));
const run = args => new Promise((resolve, reject) => {
  const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", code => code === 0 ? resolve() : reject(new Error(stderr)));
});
for (const entry of entries) {
  const { slug, source, duration, nativeLoop = false, rotateSeam = false, version = "filmed-v2", inputs = [], composite, start = 0, fps = 30 } = entry;
  if (!/^[a-z-]+$/.test(slug) || !Number.isFinite(duration) || duration <= 2) throw new Error("Invalid source manifest");
  if (!/^[a-z0-9-]+$/.test(version)) throw new Error("Invalid asset version");
  const target = `public/solo/views/${slug}-${version}.mp4`;
  try { await access(target); console.log(`${slug}: immutable file retained`); continue; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const temporary = `.tmp/solo-filmed/${slug}-encoded.mp4`;
  if (![24,25,30,60].includes(fps)) throw new Error("Unsupported frame rate");
  const scale = `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=${fps},format=yuv420p`;
  // No optical flow, UV warping, synthetic camera movement, reversing water,
  // or ping-ponging animals. A short dissolve joins the photographed ends.
  const overlap = 0.6;
  const frames = Math.floor(duration * fps) - 1;
  const length = frames / fps;
  const base = composite ?? `[0:v]trim=start=${start},setpts=PTS-STARTPTS,${scale}[base]`;
  const output = rotateSeam ? "joined" : "out";
  let filter = base + (nativeLoop ? `;[base]fps=${fps},trim=duration=${length},setpts=PTS-STARTPTS[${output}]`
    : `;[base]fps=${fps},trim=duration=${length},setpts=PTS-STARTPTS,split[tail][head];` +
      `[tail]trim=start=${overlap},setpts=PTS-STARTPTS,fps=${fps},settb=AVTB[a];` +
      `[head]trim=end=${overlap},setpts=PTS-STARTPTS,fps=${fps},settb=AVTB[b];` +
      `[a][b]xfade=transition=fade:duration=${overlap}:offset=${length - overlap * 2}[${output}]`);
  if (rotateSeam) {
    // Put the playback boundary inside an uninterrupted photographed segment.
    // The source-end dissolve remains inside the loop, away from codec edges.
    const midpoint = Math.floor((length - overlap) * fps / 2) / fps;
    filter += `;[joined]split[j1][j2];[j1]trim=start=${midpoint},setpts=PTS-STARTPTS[second];[j2]trim=end=${midpoint},setpts=PTS-STARTPTS[first];[second][first]concat=n=2:v=1:a=0[out]`;
  }
  const maxrate = Math.floor(Math.min(2200, 55000 / length));
  await run(["-hide_banner", "-loglevel", "error", "-y", "-threads", "2", "-i", source, ...inputs.flatMap(path=>["-loop","1","-i",path]),
    "-filter_complex", filter, "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "medium",
    "-crf", "25", "-maxrate", `${maxrate}k`, "-bufsize", `${maxrate * 2}k`,
    "-threads", "2", "-filter_complex_threads", "1", "-pix_fmt", "yuv420p", "-movflags", "+faststart", temporary]);
  const bytes = (await stat(temporary)).size;
  if (bytes > 8000000) throw new Error(`${slug}: exceeds the 8 MB budget`);
  // Publish only after encoding finishes; a running dev server cannot serve a partial MP4.
  await rename(temporary, target);
  const poster = `.tmp/solo-filmed/${slug}-poster.webp`;
  await run(["-hide_banner", "-loglevel", "error", "-y", "-i", target, "-frames:v", "1", "-quality", "85", poster]);
  await rename(poster, `public/solo/views/${slug}-${version}.webp`);
  console.log(`${slug}: ${bytes} bytes, ${nativeLoop ? "source loop" : "photographed motion with seam dissolve"}`);
}
