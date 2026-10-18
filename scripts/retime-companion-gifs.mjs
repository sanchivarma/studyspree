import sharp from "sharp";
import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Timing repair only: reuse the ACTIVE source frames. No interpolation,
// generated poses, optical flow, mirroring, cropping or image resizing.
const manifestPath = "src/lib/characters/mediaRevisions.json";
const revisions = JSON.parse(await readFile(manifestPath, "utf8"));
const slugs = [...Array.from({ length: 12 }, (_, i) => `realistic-${String(i + 1).padStart(2, "0")}`), "medieval-scholar", "medieval-scribe", "einstein"];
const ledgerPath = "public/characters/LICENCES.md";
let ledger = await readFile(ledgerPath, "utf8");
for (const [index, slug] of slugs.entries()) {
  const sourceVersion = slug === "realistic-02" ? "v4" : /^realistic-0[1345678]$/.test(slug) ? "v3" : "v1";
  const path = `public/characters/${slug}/study-v11.gif`;
  try { await access(path); throw new Error(`Immutable output exists: ${path}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const source = await readFile(`public/characters/${slug}/study-${sourceVersion}.gif`);
  const metadata = await sharp(source, { animated: true }).metadata();
  // Different reading pauses AND different repeat periods prevent lockstep.
  const readingPauseMs = 15000 + (index * 337) % 5001;
  const delays = metadata.delay.map(ms => Math.round(ms * 1.5 / 10) * 10);
  delays[0] = Math.round(readingPauseMs / 10) * 10;
  const gif = await sharp(source, { animated: true }).gif({ loop: 0, delay: delays, colours: 256, effort: 7, keepDuplicateFrames: true }).toBuffer();
  const actual = await sharp(gif, { animated: true }).metadata();
  if (gif.length > 2 * 1024 * 1024 || actual.pages !== metadata.pages || actual.loop !== 0 || JSON.stringify(actual.delay) !== JSON.stringify(delays)) throw new Error(`Invalid timing output: ${slug}`);
  await writeFile(path, gif, { flag: "wx" });
  revisions[slug] = { version: "v11", posterVersion: sourceVersion, loopSeconds: delays.reduce((a,b)=>a+b,0)/1000,
    gifSeconds: delays.reduce((a,b)=>a+b,0)/1000, gifFrames: actual.pages, gifWidth: actual.width, gifHeight: actual.pageHeight,
    gifDelays: delays, readingPauseMs: delays[0], sourceVersion, sourceSha256: createHash("sha256").update(source).digest("hex"), video: false };
  ledger += `\n| ${slug}/study-v11.gif | studyspree-ai-${slug}-v11 | Timing-only revision of original ${sourceVersion} frames; scripts/retime-companion-gifs.mjs; docs/page-turns/README.md | Original generated project artwork; original source terms apply | 2026-10-18 | subject to generation-service terms |`;
  console.log(`${slug}: first reading pause ${delays[0]/1000}s; cycle ${revisions[slug].loopSeconds}s; existing action 1.5x slower; ${gif.length} bytes`);
}
await writeFile(ledgerPath, ledger + "\n");
await writeFile(manifestPath, JSON.stringify(revisions, null, 2) + "\n");
