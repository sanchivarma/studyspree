import { spawnSync } from "node:child_process";
import { readFile, writeFile, access } from "node:fs/promises";
import sharp from "sharp";
const executable = process.argv[2] ?? "ffmpeg";
const root = "public/characters/tesla/";
for (const extension of ["mp4", "webm", "gif"]) {
  const output = `${root}study-v12.${extension}`;
  try { await access(output); throw new Error(`Immutable asset exists: ${output}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const filters = extension === "gif" ? ["-filter_complex", "[0:v]setpts=0.65*PTS,fps=20,split[a][b];[a]palettegen[p];[b][p]paletteuse"] : ["-vf", "setpts=0.65*PTS,fps=30"];
  const encoding = extension === "gif" ? ["-loop", "0"] : extension === "mp4" ? ["-c:v", "libx264", "-crf", "23", "-movflags", "+faststart"] : ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0"];
  const result = spawnSync(executable, ["-hide_banner", "-loglevel", "error", "-n", "-i", `${root}study-v5.mp4`, ...filters, "-an", ...encoding, output], { windowsHide: true, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "Tesla encoding error");
}
const metadata = await sharp(`${root}study-v12.gif`, { animated: true }).metadata();
const path = "src/lib/characters/mediaRevisions.json", revisions = JSON.parse(await readFile(path, "utf8"));
revisions.tesla = { version: "v12", posterVersion: "v5", loopSeconds: 13, gifSeconds: metadata.delay.reduce((a,b)=>a+b,0)/1000,
  gifFrames: metadata.pages, gifWidth: metadata.width, gifHeight: metadata.pageHeight, gifDelays: metadata.delay, readingPauseMs: 0, video: true };
await writeFile(path, JSON.stringify(revisions, null, 2) + "\n");
let ledger = await readFile("public/characters/LICENCES.md", "utf8");
for (const extension of ["mp4", "webm", "gif"]) ledger += `\n| tesla/study-v12.${extension} | studyspree-ai-tesla-v12 | Original slow v5 writing video retimed to 13 seconds; scripts/retime-tesla.mjs | Original generated project artwork; original source terms apply | 2026-10-18 | subject to generation-service terms |`;
await writeFile("public/characters/LICENCES.md", ledger + "\n");
