import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { themes } from "../src/lib/themes/registry.ts";
import { roomSounds, musicTracks } from "../src/lib/audio/catalog.ts";

const root = new URL("../public/", import.meta.url);
const ledger = await readFile(new URL("themes/LICENCES.md", root), "utf8");
const hashes = new Set();
for (const theme of themes) {
  for (const src of [theme.mp4, theme.webm, theme.poster]) {
    const bytes = await readFile(new URL(src.slice(1), root));
    if (!bytes.length || bytes.length > 8000000) throw new Error(`${src}: invalid size`);
    const valid = src.endsWith(".mp4") ? bytes.toString("ascii", 4, 8) === "ftyp"
      : src.endsWith(".webm") ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      : bytes[0] === 0xff && bytes[1] === 0xd8;
    if (!valid) throw new Error(`${src}: invalid media signature`);
    if (!ledger.includes(src.replace("/themes/", ""))) throw new Error(`${src}: missing licence record`);
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hashes.has(hash)) throw new Error(`${src}: duplicate scene asset`);
    hashes.add(hash);
  }
}
for (const src of [...Object.values(roomSounds), ...musicTracks.map(track => track.src)]) {
  const bytes = await readFile(new URL(src.slice(1), root));
  if (!bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) throw new Error(`${src}: invalid WebM`);
}
console.log(`Verified ${themes.length} original theme scenes, posters and current audio assets in ${fileURLToPath(root)}.`);
