import { readFile, writeFile, mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

// Uses an existing ffmpeg installation; no application dependency is needed.
const ffmpeg = process.argv[2] ?? "ffmpeg";
if (spawnSync(ffmpeg, ["-version"], { windowsHide: true }).status !== 0) throw new Error("ffmpeg is required. Pass its executable path as the first argument.");
const catalog = JSON.parse(await readFile(new URL("./ambience-sources.json", import.meta.url), "utf8"));
const entries = process.argv[3] ? catalog.filter(entry => entry.file === process.argv[3]) : catalog;
if (!entries.length) throw new Error("No matching catalog asset");
const output = new URL("../public/audio/", import.meta.url);
for (const entry of entries) {
  if (!/^effect-[a-z]+(?:-[a-z]+)*-v\d+\.mp3$/.test(entry.file)) throw new Error("Invalid output filename");
  try { await access(new URL(entry.file, output)); throw new Error(`Immutable asset exists: ${entry.file}. Choose a new version.`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const scratch = await mkdtemp(join(tmpdir(), "studyspree-ambience-"));
const hashes = [];
try {
  for (const entry of entries) {
    console.log(`Checking licence: ${entry.file}`);
    const page = await fetch(entry.page, { signal: AbortSignal.timeout(60000) }); const html = await page.text();
    if (!page.ok || !html.includes("Creative Commons 0")) throw new Error(`Cannot verify CC0: ${entry.page}`);
    console.log(`Downloading: ${entry.file}`);
    const response = await fetch(entry.preview, { signal: AbortSignal.timeout(180000),
      headers: entry.previewBytes ? { Range: `bytes=0-${entry.previewBytes - 1}` } : undefined });
    if (!response.ok) throw new Error(`Download error: ${entry.preview}`);
    if (entry.previewBytes && response.status !== 206) throw new Error("Source server did not honor the excerpt request");
    const source = Buffer.from(await response.arrayBuffer());
    const input = join(scratch, entry.file); await writeFile(input, source, { flag: "wx" });
    const destination = new URL(entry.file, output);
    console.log(`Encoding: ${entry.file}`);
    const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-n", "-i", input, "-t", "180", "-af", entry.filters, "-ar", "44100", "-ac", "2", "-codec:a", "libmp3lame", "-b:a", "128k", "-map_metadata", "-1", fileURLToPath(destination)], { windowsHide: true, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || "Encoding error");
    const bytes = await readFile(destination);
    if (bytes.length > 8000000) throw new Error(`${entry.file} exceeds the 8 MB budget`);
    hashes.push({ file: entry.file, bytes: bytes.length, sourceSha256: createHash("sha256").update(source).digest("hex"), sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  console.log(JSON.stringify(hashes, null, 2));
} finally {
  // mkdtemp creates this exact scratch directory; no user-supplied deletion path.
  await rm(scratch, { recursive: true, force: true });
}
