import { access, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Exact, unmodified downloads for NONCOMMERCIAL LOCAL PREVIEW. No re-encoding,
// trimming or production redistribution: these recordings are CC BY-NC-ND.
const choices = [
  ["jamendo-557142", "medieval-warrior-v1.mp3"],
  ["jamendo-456140", "medieval-walk-v1.mp3"],
  ["jamendo-354239", "medieval-knight-v1.mp3"],
];
await mkdir(".local/audio", { recursive: true });
const records = [];
for (const [id, file] of choices) {
  const output = `.local/audio/${file}`;
  try { await access(output); throw new Error(`Local recording exists: ${output}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const response = await fetch(`https://archive.org/metadata/${id}`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Metadata unavailable: ${id}`);
  const item = await response.json();
  if (item.metadata?.licenseurl !== "http://creativecommons.org/licenses/by-nc-nd/3.0/") throw new Error(`Review changed licence: ${id}`);
  const tracks = item.files.filter(entry => entry.name.endsWith(".mp3"));
  if (tracks.length !== 1) throw new Error(`Choose an explicit track: ${id}`);
  const source = `https://archive.org/download/${id}/${encodeURIComponent(tracks[0].name)}`;
  const download = await fetch(source, { signal: AbortSignal.timeout(180000) });
  if (!download.ok) throw new Error(`Download unavailable: ${id}`);
  const bytes = Buffer.from(await download.arrayBuffer());
  if (bytes.length !== Number(tracks[0].size) || bytes.length > 8000000) throw new Error(`Invalid recording size: ${id}`);
  await writeFile(output, bytes, { flag: "wx" });
  records.push({ file, title: item.metadata.title, creator: item.metadata.creator, source, licence: item.metadata.licenseurl, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), productionPermitted: false });
  console.log(`${file}: ${bytes.length} unmodified bytes; local noncommercial preview`);
}
await writeFile("docs/audio/local-preview-source-hashes.json", JSON.stringify(records, null, 2) + "\n");
