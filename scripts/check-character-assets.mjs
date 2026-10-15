import sharp from "sharp";
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../public/characters/", import.meta.url));
const ledger = await readFile(join(root, "LICENCES.md"), "utf8");
const slugs = ["male", "female"].flatMap(gender => [1, 2, 3, 4].map(index => `${gender}-0${index}`));
const dirs = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
if (JSON.stringify(dirs) !== JSON.stringify([...slugs].sort())) throw new Error("Expected exactly four male and four female character asset folders");
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
console.log("Verified eight distinct animated characters and their posters.");
