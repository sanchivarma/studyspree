import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, statSync, copyFileSync, constants, unlinkSync, rmdirSync, mkdtempSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const [source, slug, version = "video-v1"] = process.argv.slice(2);
if (!source || !/^realistic-0[12]$/.test(slug ?? "") || !/^video-v[1-9][0-9]*$/.test(version)) throw new Error("Usage: node scripts/prepare-companion-video.mjs source.mp4 realistic-01 [video-v1]. Supply original fictional-adult footage with recorded commercial rights.");
const root = fileURLToPath(new URL("../public/characters/", import.meta.url));
const target = resolve(root, slug);
if (relative(root, target).startsWith(`..${sep}`)) throw new Error("Asset path must stay inside public/characters");
for (const name of [`study-${version}.webm`, `study-${version}.mp4`, `poster-${version}.webp`]) if (existsSync(resolve(target, name))) throw new Error("Assets are immutable. Choose a new version.");
let duration;
try { duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", resolve(source)], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()); }
catch { throw new Error("Install ffmpeg/ffprobe and provide a readable source video. No files were changed."); }
if (!Number.isFinite(duration) || duration < 120 || duration > 180) throw new Error("Source must contain 120–180 seconds of actual motion. This helper does not repeat a short clip to invent a longer recording.");
mkdirSync(target, { recursive: true });
const stage = mkdtempSync(resolve(target, ".prepare-"));
const names = ["study.webm", "study.mp4", "poster.webp"];
try {
  const common = ["-nostdin", "-n", "-i", resolve(source), "-an", "-vf", "fps=15,scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2"];
  execFileSync("ffmpeg", [...common, "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", resolve(stage, names[0])], { stdio: "ignore" });
  execFileSync("ffmpeg", [...common, "-c:v", "libx264", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", resolve(stage, names[1])], { stdio: "ignore" });
  execFileSync("ffmpeg", ["-nostdin", "-n", "-i", resolve(source), "-frames:v", "1", "-vf", "scale=640:480:force_original_aspect_ratio=decrease", resolve(stage, names[2])], { stdio: "ignore" });
  for (const name of names) if (statSync(resolve(stage, name)).size > (name.endsWith("webp") ? 262144 : 8000000)) throw new Error("Prepared file exceeds its budget. Reduce source complexity/resolution and use a new version.");
  for (const name of names) {
    const destination = name.replace("study.", `study-${version}.`).replace("poster.", `poster-${version}.`);
    copyFileSync(resolve(stage, name), resolve(target, destination), constants.COPYFILE_EXCL); console.log(`/characters/${slug}/${destination}`);
  }
  console.log("Prepared media. Record its source/rights in public/characters/LICENCES.md and connect these paths plus the measured loopSeconds in src/lib/characters/registry.ts before shipping.");
} finally {
  // These exact staging files were created by this invocation; never remove user sources.
  for (const name of names) if (existsSync(resolve(stage, name))) unlinkSync(resolve(stage, name));
  rmdirSync(stage);
}
