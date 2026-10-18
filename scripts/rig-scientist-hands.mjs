import sharp from "sharp";
import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ffmpeg = process.argv[2] ?? "ffmpeg";
const version = process.argv[3] ?? "v24";
if (!/^v\d+$/.test(version)) throw new Error("Invalid immutable output version");
const definitions = {
  einstein: {
    wrist: [83, 172], stable: [65, 130, 205, 210],
    paths: ["M79 166 Q82 159 91 157 L97 152 Q107 152 118 162 L120 169 Q119 177 106 179 L85 179 Q79 177 79 172Z", "M94 138 Q95 136 97 138 L112 158 L124 176 L121 178 L109 160Z"],
  },
  tesla: {
    wrist: [68, 184], stable: [45, 140, 215, 215],
    paths: ["M68 182 Q71 174 81 173 L89 165 Q94 163 101 169 L112 175 Q116 182 112 190 L105 193 L80 194 Q68 193 68 189Z", "M91 148 L94 148 L103 173 L114 192 L112 194 L101 176Z"],
  },
};
let ledger = await readFile("public/characters/LICENCES.md", "utf8");
const revisions = JSON.parse(await readFile("src/lib/characters/mediaRevisions.json", "utf8")), prepared = {};
for (const [slug, definition] of Object.entries(definitions)) {
  const root = `public/characters/${slug}`;
  for (const extension of ["gif", "mp4", "webm"]) {
    try { await access(`${root}/study-${version}.${extension}`); throw new Error("Immutable output exists"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const source = await readFile(`${root}/study-v20.gif`);
  const metadata = await sharp(source, { animated: true }).metadata();
  const { width, pageHeight: height } = metadata, stride = width * height * 4;
  const background = await sharp(source, { animated: true }).ensureAlpha().raw().toBuffer();
  const original = await sharp(`${root}/study-v14.gif`).ensureAlpha().raw().toBuffer();
  const plate = await sharp(`docs/historical-companions/${slug}-hand-cleanplate-v1.png`).resize(width, height, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${definition.paths.map(d => `<path d="${d}" fill="white"/>`).join("")}</svg>`;
  const mask = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  // Only the hand and pen move. A hidden clean plate removes the old silhouette
  // so there is no doubled pen or skin ghost when the cutout shifts.
  const envelope = await sharp(Buffer.from(svg)).dilate(5).blur(0.6).ensureAlpha().raw().toBuffer();
  const sample = (buffer, x, y, channel) => {
    if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) return 0;
    const ix = Math.floor(x), iy = Math.floor(y), dx = x - ix, dy = y - iy, p = (iy * width + ix) * 4 + channel;
    return buffer[p] * (1-dx)*(1-dy) + buffer[p+4]*dx*(1-dy) + buffer[p+width*4]*(1-dx)*dy + buffer[p+width*4+4]*dx*dy;
  };
  const strikeTimes=[0.4,1.45,2.8,4.2,5.35,6.7,7.95,9.4,10.8,12.1];
  const arcs=[];
  if(slug === "tesla")for(let strike=0;strike<strikeTimes.length;strike++){
    const paths=[[[273,52],[288,64],[283,75],[303,88],[296,101],[313,118]],[[231,53],[218,66],[226,77],[212,89],[219,103],[207,120]]];
    const lines=paths.map((points,branch)=>points.map(([x,y],index)=>[x+(index===0?0:Math.sin(strike*2.3+index*3.7+branch)*4),y].join(',')).join(' '));
    const strokes=lines.map(points=>'<polyline points="'+points+'" fill="none" stroke-linejoin="miter"/>').join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><g stroke="#477dff" stroke-width="3.5" opacity="0.35">'+strokes+'</g><g stroke="#9fcfff" stroke-width="1.5" opacity="0.95">'+strokes+'</g><g stroke="#effbff" stroke-width="0.65">'+strokes+'</g></svg>';
    arcs.push(await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer());
  }
  const render = fps => {
    const count = 13 * fps, frames = [];
    for (let frame = 0; frame < count; frame++) {
      const phase = Math.PI * 2 * frame / count;
      const output = Buffer.from(background.subarray(Math.floor(frame/count*metadata.pages)*stride, (Math.floor(frame/count*metadata.pages)+1)*stride));
      const [left, top, right, bottom] = definition.stable;
      const angle = 0.035*Math.sin(phase*7) + 0.012*Math.sin(phase*11);
      // Write across a line, then lift the pen and return. Two lines per loop.
      const line=(frame/count*2)%1, smooth=t=>t*t*(3-2*t);
      const drift=line<0.84 ? -3+11*smooth(line/0.84) : 8-11*smooth((line-0.84)/0.16);
      const lift=line<0.84 ? 0 : -2.2*Math.sin(Math.PI*(line-0.84)/0.16);
      const cosine = Math.cos(angle), sine = Math.sin(angle);
      if(slug === "tesla"){
        const seconds=frame/fps, strike=strikeTimes.findIndex(time=>seconds>=time&&seconds<time+0.2);
        const pulse=strike<0?0:Math.pow(1-(seconds-strikeTimes[strike])/0.2,1.5);
        for(let y=0;y<135;y++)for(let x=205;x<width;x++){const p=(y*width+x)*4;for(let c=0;c<3;c++)output[p+c]=original[p+c];if(pulse){const alpha=arcs[strike][p+3]/255*pulse;for(let c=0;c<3;c++)output[p+c]=Math.round(output[p+c]*(1-alpha)+arcs[strike][p+c]*alpha);}}
      }
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const p = (y*width+x)*4, fill = envelope[p+3]/255;
        for (let c=0;c<3;c++) output[p+c] = Math.round(original[p+c]*(1-fill)+plate[p+c]*fill);
        // Keep the wrist attached while the hand advances beyond the cuff.
        if(drift>2&&x>=definition.wrist[0]-2&&x<definition.wrist[0]+drift&&Math.abs(y-definition.wrist[1])<5){
          const alpha=Math.min(1,(5-Math.abs(y-definition.wrist[1]))/1.5);
          for(let c=0;c<3;c++)output[p+c]=Math.round(output[p+c]*(1-alpha)+sample(original,definition.wrist[0]+2,y-lift,c)*alpha);
        }
        const dx=x-definition.wrist[0]-drift, dy=y-definition.wrist[1]-lift;
        const sx=definition.wrist[0]+dx*cosine+dy*sine, sy=definition.wrist[1]-dx*sine+dy*cosine;
        const alpha=sample(mask,sx,sy,3)/255;
        if(alpha)for(let c=0;c<3;c++)output[p+c]=Math.round(output[p+c]*(1-alpha)+sample(original,sx,sy,c)*alpha);
      }
      frames.push(output);
    }
    return Buffer.concat(frames);
  };
  // One global palette prevents unchanged faces/clothing from changing colour
  // when a bright discharge or moving hand alters the frame histogram.
  const paletteSource='.tmp/'+slug+'-hand-palette-source.png';
  await sharp(source).png().toFile(paletteSource);
  const gifResult=spawnSync(ffmpeg,["-hide_banner","-loglevel","error","-n","-f","rawvideo","-pixel_format","rgba","-video_size",width+"x"+height,"-framerate","20","-i","pipe:0","-i",paletteSource,"-filter_complex","[1:v]palettegen=reserve_transparent=0[palette];[0:v][palette]paletteuse=dither=none:diff_mode=rectangle","-loop","0",root+"/study-"+version+".gif"],{input:render(20),windowsHide:true,maxBuffer:1048576});
  if(gifResult.status!==0)throw new Error(gifResult.error?.message||gifResult.stderr?.toString()||"GIF encoding error");
  const gif=await readFile(root+"/study-"+version+".gif");
  if(gif.length>2097152)throw new Error(slug+": GIF exceeds budget");
  const raw = render(30);
  for(const extension of ["mp4","webm"]) {
    const codec=extension === "mp4" ? ["-c:v","libx264","-crf","10","-g","30","-bf","0","-movflags","+faststart"] : ["-c:v","libvpx-vp9","-lossless","1","-b:v","0"];
    const result=spawnSync(ffmpeg,["-hide_banner","-loglevel","error","-n","-f","rawvideo","-pixel_format","rgba","-video_size",`${width}x${height}`,"-framerate","30","-i","pipe:0","-an",...codec,"-pix_fmt","yuv420p",`${root}/study-${version}.${extension}`],{input:raw,windowsHide:true,maxBuffer:1048576});
    if(result.status!==0)throw new Error(result.error?.message||result.stderr?.toString()||"Video encoding error");
  }
  prepared[slug]={...revisions[slug],version,sourceVersion:"v20",sourceSha256:createHash("sha256").update(source).digest("hex"),writingSmoothing:"isolated-rigid-hand-and-pen-no-pose-morph",backgroundPreservedFrom:slug === "einstein" ? "v20" : null,backgroundMotion:slug === "einstein" ? revisions[slug].backgroundMotion : "short-sharp-coil-discharges",writingTravel:"two-left-to-right-lines-with-pen-lift",stableBodyRegion:definition.stable};
  for(const extension of ["gif","mp4","webm"])ledger+=`\n| ${slug}/study-${version}.${extension} | studyspree-ai-${slug}-${version} | Original hand/pen cutout with generated hidden clean plate; Einstein v20 background preserved; Tesla coil discharges updated; scripts/rig-scientist-hands.mjs | Original project artwork; generation-service terms apply | 2026-10-18 | subject to generation-service terms |`;
  console.log(`${slug}: isolated hand/pen rig; across-page travel; ${gif.length} GIF bytes`);
}
await writeFile(`.tmp/scientist-hands-${version}.json`,JSON.stringify(prepared,null,2)+"\n");
await writeFile("public/characters/LICENCES.md",ledger+"\n");
