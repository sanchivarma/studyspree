import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const ffmpeg = process.env.FFMPEG_PATH ?? join(root, ".tmp/media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe");
const metadataPath = join(root, "src/lib/characters/mediaRevisions.json");
const revisions = JSON.parse(readFileSync(metadataPath, "utf8"));
const ledgerPath = join(root, "public/characters/LICENCES.md");
const retired = new Set(["medieval-scholar", "medieval-scribe"]);
const version = "playback-v1";
const audit = [];
const hash = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const run = args => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });

for (const [slug, revision] of Object.entries(revisions)) {
  if (retired.has(slug)) continue;
  const directory = join(root, "public/characters", slug);
  const sourceName = revision.playbackSource ?? `study-${revision.version}.${revision.video ? "mp4" : "gif"}`;
  const source = join(directory, sourceName);
  if (!existsSync(source)) throw new Error(`${slug}: missing original playback source`);
  const input = source.endsWith(".gif") ? ["-ignore_loop", "1", "-i", source] : ["-i", source];
  const mp4 = join(directory, `study-${version}.mp4`);
  const webm = join(directory, `study-${version}.webm`);
  // Keep the approved source poses, holds and chronology. No optical-flow
  // synthesis: constant timestamps and native video decoding address playback.
  if (!existsSync(mp4)) run([...input, "-map", "0:v:0", "-vf", "fps=30,scale=320:240:flags=lanczos,format=yuv420p", "-t", String(revision.loopSeconds), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-g", "60", "-bf", "0", "-threads", "1", "-movflags", "+faststart", "-n", mp4]);
  if (!existsSync(webm)) run(["-i", mp4, "-map", "0:v:0", "-an", "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-crf", "34", "-b:v", "0", "-g", "60", "-threads", "1", "-n", webm]);
  for (const output of [mp4, webm]) {
    if (statSync(output).size > 8_000_000) throw new Error(`${slug}: playback asset exceeds 8 MB`);
    // Decode the entire recording, including its final frames, before enabling it.
    run(["-i", output, "-map", "0:v:0", "-an", "-f", "null", "-"]);
  }
  audit.push({ slug, source: sourceName, sourceSha256: hash(source), durationSeconds: revision.loopSeconds,
    width: 320, height: 240, fps: 30, mp4Bytes: statSync(mp4).size, webmBytes: statSync(webm).size,
    mp4Sha256: hash(mp4), webmSha256: hash(webm), fullDecode: true });
  revision.video = true;
  revision.videoVersion = version;
  revision.playbackSource = sourceName;
  const path = `${slug}/study-${version}`;
  if (!readFileSync(ledgerPath, "utf8").includes(`${path}.mp4`)) appendFileSync(ledgerPath, `\n- \`${path}.mp4\`, \`${path}.webm\`: 30 fps muted playback encodes of \`${slug}/${sourceName}\`; source provenance and licence above are retained. H.264 fast-start / VP9 fallback; no new poses or synthetic motion.\n`);
  console.log(`${slug}: both full recordings decoded; ${revision.loopSeconds}s at 30 fps (${statSync(mp4).size} / ${statSync(webm).size} bytes)`);
}
writeFileSync(metadataPath, JSON.stringify(revisions, null, 2) + "\n");
mkdirSync(join(root, "docs/character-playback"), { recursive: true });
writeFileSync(join(root, "docs/character-playback/audit.json"), JSON.stringify(audit, null, 2) + "\n");
console.log(`Verified ${audit.length} character playback pairs. Source pose quality requires visual review.`);
