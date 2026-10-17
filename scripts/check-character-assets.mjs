import sharp from "sharp";
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../public/characters/", import.meta.url));
const ledger = await readFile(join(root, "LICENCES.md"), "utf8");
const slugs = ["male", "female"].flatMap(gender => [1, 2, 3, 4].map(index => `${gender}-0${index}`));
const dirs = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const extra = ["moss-fox", "pip-owl", "momo-cloud", ...[1,2,3,4,5,6,7,8].map(n => `realistic-0${n}`)];
if (JSON.stringify(dirs) !== JSON.stringify([...slugs, ...extra].sort())) throw new Error("Expected the eight illustrated adults, three whimsical partners and eight realistic GIFs");
const hashes = new Set();
for (const slug of slugs) {
  const gifPath = join(root, slug, "study-v1.gif");
  const bytes = await readFile(gifPath);
  if (!["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString())) throw new Error(`${slug}: invalid GIF header`);
  if (bytes.length > 2 * 1024 * 1024) throw new Error(`${slug}: exceeds the 2 MiB GIF budget`);
  const metadata = await sharp(bytes, { animated: true }).metadata();
  if ((metadata.pages ?? 1) < 2 || metadata.loop !== 0) throw new Error(`${slug}: must animate and loop forever`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hashes.has(hash)) throw new Error(`${slug}: duplicate animation`);
  hashes.add(hash);
  const poster = join(root, slug, "poster-v1.webp");
  if ((await stat(poster)).size > 256 * 1024 || (await sharp(poster).metadata()).format !== "webp") throw new Error(`${slug}: invalid poster`);
  for (const file of ["study-v1.gif", "poster-v1.webp"]) if (!ledger.includes(`${slug}/${file}`)) throw new Error(`${slug}: missing licence row`);
  if (!ledger.includes(`studyspree-original-${slug}-v1`)) throw new Error(`${slug}: missing provenance ID`);
  console.log(`${slug}: ${metadata.pages} frames, infinite loop, ${bytes.length} bytes`);
}
for (const slug of [...slugs, ...extra].filter(slug => !slug.startsWith("realistic-"))) {
  const poster = await readFile(join(root, slug, "poster-v1.webp"));
  if ((await sharp(poster).metadata()).format !== "webp" || poster.length > 256 * 1024) throw new Error(`${slug}: invalid poster`);
  if (!ledger.includes(`${slug}/poster-v1.webp`)) throw new Error(`${slug}: missing poster provenance`);
  for (const format of ["webm", "mp4"]) {
    const name = `${slug}/study-v2.${format}`;
    const bytes = await readFile(join(root, name));
    const valid = format === "webm" ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) : bytes.toString("ascii", 4, 8) === "ftyp";
    if (!valid || bytes.length > 8000000 || !ledger.includes(name)) throw new Error(`${name}: invalid, oversized or unrecorded video`);
  }
}
for (const slug of extra.filter(slug => slug.startsWith("realistic-"))) {
  const lin = slug === "realistic-02", version = lin ? "v4" : "v3";
  const bytes = await readFile(join(root, slug, `study-${version}.gif`));
  const metadata = await sharp(bytes, { animated: true }).metadata();
  if (metadata.pages !== (lin ? 109 : 16) || metadata.loop !== 0 || metadata.width !== (lin ? 320 : 360) || metadata.pageHeight !== (lin ? 240 : 270) || metadata.delay.reduce((sum, delay) => sum + delay, 0) !== (lin ? 5450 : 5020) || (lin && metadata.delay.some(delay => delay !== 50)) || bytes.length > 2 * 1024 * 1024) throw new Error(`${slug}: invalid realistic GIF`);
  const frames = new Set();
  for (let page = 0; page < metadata.pages; page++) frames.add(createHash("sha256").update(await sharp(bytes, { page }).raw().toBuffer()).digest("hex"));
  if (frames.size < (lin ? 50 : 12)) throw new Error(`${slug}: insufficient distinct studying frames`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hashes.has(hash)) throw new Error(`${slug}: duplicate animation`);
  hashes.add(hash);
  const poster = await readFile(join(root, slug, `poster-${version}.webp`));
  if ((await sharp(poster).metadata()).format !== "webp" || poster.length > 256 * 1024) throw new Error(`${slug}: invalid poster`);
  for (const file of [`study-${version}.gif`, `poster-${version}.webp`]) if (!ledger.includes(`${slug}/${file}`)) throw new Error(`${slug}: missing licence row`);
  if (!ledger.includes(`studyspree-ai-${slug}-${version}`)) throw new Error(`${slug}: missing provenance ID`);
  console.log(`${slug}: ${frames.size} distinct frames, ${lin ? 5.45 : 5.02}s infinite GIF, ${bytes.length} bytes`);
}
console.log("Verified eight illustrated adults, three whimsical partners and eight realistic studying GIFs.");
