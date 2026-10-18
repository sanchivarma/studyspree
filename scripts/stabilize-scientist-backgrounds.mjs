import sharp from "sharp";
import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ffmpeg = process.argv[2] ?? "ffmpeg";
const manifestPath = "src/lib/characters/mediaRevisions.json";
const revisions = JSON.parse(await readFile(manifestPath, "utf8"));
let ledger = await readFile("public/characters/LICENCES.md", "utf8");
for (const slug of ["einstein", "tesla"]) {
  const root = `public/characters/${slug}`, version = "v14";
  for (const extension of ["gif", "webm", "mp4"]) {
    try { await access(`${root}/study-${version}.${extension}`); throw new Error("Immutable output already exists"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const source = await readFile(`${root}/study-v12.gif`);
  const metadata = await sharp(source, { animated: true }).metadata();
  const width = metadata.width, height = metadata.pageHeight, stride = width * height * 4;
  const raw = await sharp(source, { animated: true }).ensureAlpha().raw().toBuffer();
  const base = raw.subarray(0, stride), frames = [];
  // Restore a stable photographed background/face; retain native writing
  // frames around hands, pen and book. Feathering avoids a rectangular seam.
  const region = slug === "einstein" ? [70, 143, 187, 185] : [59, 160, 210, 208];
  const feather = 8;
  const weight = (x, y) => Math.max(0, Math.min(1, (x-region[0])/feather, (region[2]-x)/feather, (y-region[1])/feather, (region[3]-y)/feather));
  for (let frame = 0; frame < metadata.pages; frame++) {
    const output = Buffer.from(base), offset = frame * stride;
    for (let y = region[1]; y < region[3]; y++) for (let x = region[0]; x < region[2]; x++) {
      const alpha = weight(x,y), pixel = (y*width+x)*4;
      for (let channel=0;channel<3;channel++) output[pixel+channel] = Math.round(base[pixel+channel]*(1-alpha)+raw[offset+pixel+channel]*alpha);
    }
    frames.push(output);
  }
  const joined = Buffer.concat(frames), gifPath = `${root}/study-${version}.gif`;
  const gif = await sharp(joined, { raw: { width, height: height * frames.length, channels: 4, pageHeight: height } })
    .gif({ loop: 0, delay: metadata.delay, colours: 256, effort: 7, keepDuplicateFrames: true }).toBuffer();
  if (gif.length>2097152) throw new Error(`GIF budget exceeded: ${slug}`);
  await writeFile(gifPath, gif, { flag: "wx" });
  const frameMs = metadata.delay[0];
  for (const extension of ["mp4", "webm"]) {
    const codec = extension === "mp4" ? ["-c:v","libx264","-crf","23","-movflags","+faststart"] : ["-c:v","libvpx-vp9","-crf","32","-b:v","0"];
    const result = spawnSync(ffmpeg, ["-hide_banner","-loglevel","error","-n","-f","rawvideo","-pixel_format","rgba","-video_size",`${width}x${height}`,"-framerate",`1000/${frameMs}`,"-i","pipe:0","-an",...codec,"-pix_fmt","yuv420p",`${root}/study-${version}.${extension}`], { input:joined,windowsHide:true,encoding:"buffer",maxBuffer:1048576 });
    if (result.status!==0) throw new Error(result.stderr.toString()||`Encoding error: ${slug}`);
  }
  revisions[slug] = { ...revisions[slug], version, video:true, sourceVersion:"v12", sourceSha256:createHash("sha256").update(source).digest("hex"), stabilizedBackground:true, writingRegion:region };
  for (const extension of ["gif","mp4","webm"]) ledger += `\n| ${slug}/study-${version}.${extension} | studyspree-ai-${slug}-${version} | Stable native first-frame background with original writing-area frames; scripts/stabilize-scientist-backgrounds.mjs | Original generated project artwork; original source terms apply | 2026-10-18 | subject to generation-service terms |`;
  console.log(`${slug}: stable background and face, native writing area, ${metadata.pages} frames; ${gif.length} GIF bytes`);
}
await writeFile(manifestPath, JSON.stringify(revisions,null,2)+"\n");
await writeFile("public/characters/LICENCES.md",ledger+"\n");
