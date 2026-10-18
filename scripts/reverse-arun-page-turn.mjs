import sharp from "sharp";
import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const sourcePath = "public/characters/realistic-01/study-v3.gif";
const output = "public/characters/realistic-01/study-v13.gif";
try { await access(output); throw new Error(`Immutable asset exists: ${output}`); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const source = await readFile(sourcePath);
const { data, info } = await sharp(source, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const metadata = await sharp(source, { animated: true }).metadata();
const frameHeight = metadata.pageHeight, stride = info.width * frameHeight * 4;
const order = Array.from({ length: metadata.pages }, (_, index) => metadata.pages - 1 - index);
const frames = order.map(index => data.subarray(index * stride, (index + 1) * stride));
const delays = order.map((_, index) => index === 0 ? 10000 : 200);
// Reverse the ACTION timeline. Do not mirror the person, room, lettering or
// book. Inspection of the native source shows its page moves right to left;
// reverse ordering makes the sheet move left to right from the viewer's side.
const result = await sharp(Buffer.concat(frames), { raw: { width: info.width, height: frameHeight * frames.length, channels: 4, pageHeight: frameHeight } })
  .gif({ loop: 0, delay: delays, colours: 256, effort: 7, keepDuplicateFrames: true }).toBuffer();
await writeFile(output, result, { flag: "wx" });
const path = "src/lib/characters/mediaRevisions.json", revisions = JSON.parse(await readFile(path, "utf8"));
revisions["realistic-01"] = { ...revisions["realistic-01"], version: "v13", gifDelays: delays, sourceSha256: createHash("sha256").update(source).digest("hex"), sourceFrameOrder: order, pageTurnDirection: "viewer-left-to-right" };
await writeFile(path, JSON.stringify(revisions, null, 2) + "\n");
let ledger = await readFile("public/characters/LICENCES.md", "utf8");
ledger += "\n| realistic-01/study-v13.gif | studyspree-ai-realistic-01-v13 | Native v3 source frames in reverse action order; scripts/reverse-arun-page-turn.mjs; no image mirroring | Original generated project artwork; original source terms apply | 2026-10-18 | subject to generation-service terms |\n";
await writeFile("public/characters/LICENCES.md", ledger);
console.log("Arun: reversed page-turn action, 10-second reading interval, 13-second cycle; no generated or mirrored poses.");
