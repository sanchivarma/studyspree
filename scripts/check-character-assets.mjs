import sharp from "sharp";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../public/characters/", import.meta.url));
const ledger = await readFile(join(root, "LICENCES.md"), "utf8");
const revisions = JSON.parse(await readFile(new URL("../src/lib/characters/mediaRevisions.json", import.meta.url), "utf8"));
const illustrated = ["male", "female"].flatMap(gender => [1, 2, 3, 4].map(n => `${gender}-0${n}`));
const whimsical = ["moss-fox", "pip-owl", "momo-cloud"];
const realistic = Array.from({ length: 12 }, (_, n) => `realistic-${String(n + 1).padStart(2, "0")}`);
const historical = ["medieval-scholar", "medieval-scribe", "einstein", "tesla"];
const slugs = [...illustrated, ...whimsical, ...realistic, ...historical];
const directories = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
if (JSON.stringify(directories) !== JSON.stringify([...slugs].sort())) throw new Error("Character directories do not match the complete cast");
const hashes = new Set(), audit = [];
for (const slug of slugs) {
  const fallback = slug === "tesla" ? { version: "v5", gifFrames: 400, gifSeconds: 20, gifWidth: 320, gifHeight: 240, video: true }
    : slug === "realistic-02" ? { version: "v4", gifFrames: 109, gifSeconds: 5.45, gifWidth: 320, gifHeight: 240 }
    : /^realistic-0[1345678]$/.test(slug) ? { version: "v3", gifFrames: 16, gifSeconds: 5.02, gifWidth: 360, gifHeight: 270 }
    : { version: "v1", gifFrames: 106, gifSeconds: 5.3, gifWidth: 320, gifHeight: 240 };
  const expected = revisions[slug] ?? fallback, version = expected.version;
  const gifName = `${slug}/study-${version}.gif`, posterName = `${slug}/poster-${expected.posterVersion ?? version}.webp`;
  const bytes = await readFile(join(root, gifName));
  if (bytes.subarray(0, 6).toString() !== "GIF89a" || bytes.length > 2 * 1024 * 1024) throw new Error(`${gifName}: invalid or oversized GIF`);
  const metadata = await sharp(bytes, { animated: true }).metadata();
  const legacyCadence = version === "v3" && realistic.includes(slug);
  const legacyDelays = [700,180,180,280,280,280,280,280,280,280,280,280,280,280,180,700];
  if (metadata.loop !== 0 || metadata.pages !== expected.gifFrames || metadata.width !== expected.gifWidth || metadata.pageHeight !== expected.gifHeight || metadata.delay.some((ms, index) => ms !== (legacyCadence ? legacyDelays[index] : 50)) || metadata.delay.reduce((a, b) => a + b, 0) !== Math.round(expected.gifSeconds * 1000)) throw new Error(`${gifName}: unexpected dimensions, duration or cadence`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hashes.has(hash)) throw new Error(`${slug}: duplicate animation`);
  hashes.add(hash);
  const raw = await sharp(bytes, { animated: true }).ensureAlpha().raw().toBuffer();
  const stride = metadata.width * metadata.pageHeight * 4;
  const samples = new Set(); let largestStep = 0;
  for (let sample = 0; sample < 64; sample++) {
    const page = Math.floor(sample * (metadata.pages - 1) / 63), start = page * stride;
    samples.add(createHash("sha256").update(raw.subarray(start, start + stride)).digest("hex"));
    if (page + 1 >= metadata.pages) continue;
    let difference = 0, count = 0;
    for (let i = 0; i < stride; i += 16) { difference += Math.abs(raw[start + i] - raw[start + stride + i]); count++; }
    largestStep = Math.max(largestStep, difference / count);
  }
  if (samples.size < 8 || largestStep > 18) throw new Error(`${slug}: insufficient movement or abrupt sampled frame change (${samples.size}, ${largestStep})`);
  const poster = await readFile(join(root, posterName));
  if (poster.length > 256 * 1024 || (await sharp(poster).metadata()).format !== "webp") throw new Error(`${slug}: invalid poster`);
  for (const name of [gifName, posterName]) if (!ledger.includes(name)) throw new Error(`${name}: missing licence entry`);
  const licenceId = `studyspree-${illustrated.includes(slug) || whimsical.includes(slug) ? "original" : "ai"}-${slug}-${version}`;
  if (!ledger.includes(licenceId)) throw new Error(`${slug}: missing provenance ID`);
  if (expected.video) for (const format of ["webm", "mp4"]) {
    const name = `${slug}/study-${version}.${format}`, video = await readFile(join(root, name));
    const valid = format === "webm" ? video.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) : video.toString("ascii", 4, 8) === "ftyp";
    if (!valid || video.length > 8000000 || !ledger.includes(name)) throw new Error(`${name}: invalid, oversized or unlicensed video`);
  }
  const record = { slug, version, gifFrames: metadata.pages, gifSeconds: expected.gifSeconds, gifFps: metadata.pages / expected.gifSeconds, gifBytes: bytes.length, sampledDistinctFrames: samples.size, largestSampledFrameStep: Math.round(largestStep * 1000) / 1000, runtimeVideo: Boolean(expected.video), sha256: hash };
  audit.push(record);
  console.log(`${slug}: ${metadata.pages} frames over ${expected.gifSeconds}s, ${samples.size} distinct samples, max sampled step ${record.largestSampledFrameStep}, ${bytes.length} bytes`);
}
await writeFile(new URL("../docs/page-turns/animation-audit.json", import.meta.url), JSON.stringify(audit, null, 2) + "\n");
console.log(`Verified ${slugs.length} companion files: decoding, infinite loops, recorded cadence, budgets and provenance. This does not establish visual animation quality.`);
