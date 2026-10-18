import sharp from "sharp";
import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Remove the accidental reading-pose holds from writers. This changes timing
// of existing frames, not anatomy. It cannot repair source-pose deformation.
const path = "src/lib/characters/mediaRevisions.json";
const revisions = JSON.parse(await readFile(path, "utf8"));
const writers = ["realistic-02", "realistic-09", "realistic-10", "realistic-11", "realistic-12", "medieval-scholar", "einstein"];
const readers = ["realistic-01", "realistic-03", "realistic-04", "realistic-05", "realistic-06", "realistic-07", "realistic-08"];
let ledger = await readFile("public/characters/LICENCES.md", "utf8");
for (const [index, slug] of (process.argv.includes("--readers-only") ? readers : [...writers, ...readers]).entries()) {
  const previous = revisions[slug];
  const sourceVersion = slug === "realistic-02" ? "v4" : /^realistic-0[1345678]$/.test(slug) ? "v3" : "v1";
  const sourcePath = `public/characters/${slug}/study-${sourceVersion}.gif`;
  const source = await readFile(sourcePath);
  const metadata = await sharp(source, { animated: true }).metadata();
  const output = `public/characters/${slug}/study-v12.gif`;
  try { await access(output); throw new Error(`Immutable asset exists: ${output}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  // Slightly different 10–15-second cycles; no deliberately held first frame.
  const writing = writers.includes(slug);
  const frameMs = writing ? 100 + (index % 4) * 10 : 200;
  const delays = Array(metadata.pages).fill(frameMs);
  if (!writing) delays[0] = 10000 + readers.indexOf(slug) * 230;
  const bytes = await sharp(source, { animated: true }).gif({ loop: 0, delay: delays, colours: 256, effort: 7, keepDuplicateFrames: true }).toBuffer();
  const actual = await sharp(bytes, { animated: true }).metadata();
  if (bytes.length > 2097152 || actual.pages !== metadata.pages || JSON.stringify(actual.delay) !== JSON.stringify(delays)) throw new Error(`Invalid cadence: ${slug}`);
  await writeFile(output, bytes, { flag: "wx" });
  revisions[slug] = { ...previous, version: "v12", loopSeconds: delays.reduce((a,b)=>a+b,0)/1000, gifSeconds: delays.reduce((a,b)=>a+b,0)/1000,
    gifDelays: delays, readingPauseMs: writing ? 0 : delays[0], sourceVersion, sourceSha256: createHash("sha256").update(source).digest("hex"), video: false };
  ledger += `\n| ${slug}/study-v12.gif | studyspree-ai-${slug}-v12 | Original ${sourceVersion} frames, ${writing ? 'continuous writing' : 'staggered reading'} cadence; scripts/repair-writing-cadence.mjs | Original generated project artwork; original source terms apply | 2026-10-18 | subject to generation-service terms |`;
  console.log(`${slug}: ${metadata.pages} frames, ${revisions[slug].gifSeconds}s, largest hold ${frameMs}ms`);
}
await writeFile(path, JSON.stringify(revisions, null, 2) + "\n");
await writeFile("public/characters/LICENCES.md", ledger + "\n");
