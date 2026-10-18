import sharp from "sharp";
import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ffmpeg = process.argv[2] ?? "ffmpeg";
const version = process.argv[3] ?? "v28";
if (!/^v\d+$/.test(version)) throw new Error("Invalid immutable output version");
const definitions = {
  einstein: {
    wrist: [83, 172], cuff: [79, 160, 179], handJoint: [88, 159, 179], skinSample: [87, 160, 178], stable: [65, 130, 205, 210],
    paths: ["M79 166 Q82 159 91 157 L97 152 Q107 152 118 162 L120 169 Q119 177 106 179 L85 179 Q79 177 79 172Z", "M94 138 Q95 136 97 138 L112 158 L124 176 L121 178 L109 160Z"],
  },
  tesla: {
    wrist: [68, 184], cuff: [69, 176, 194], handJoint: [78, 175, 194], skinSample: [77, 176, 192], stable: [45, 140, 215, 215],
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
  // Morphology on RGBA does not expand the alpha silhouette. Expand the alpha
  // channel itself so the entire original hand/pen is erased before moving it.
  const expandedAlpha = Buffer.alloc(width * height);
  // Explicit max dilation: keep every original alpha pixel and expand outward.
  // libvips morphology treats black/white foreground differently; do not use it
  // for this mask, which must erase the complete original hand and pen.
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const alpha=mask[(y*width+x)*4+3];
    if(!alpha)continue;
    for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++) {
      const tx=x+dx,ty=y+dy;
      if(dx*dx+dy*dy>64||tx<0||ty<0||tx>=width||ty>=height)continue;
      const target=ty*width+tx;expandedAlpha[target]=Math.max(expandedAlpha[target],alpha);
    }
  }
  const envelope = await sharp(expandedAlpha,{raw:{width,height,channels:1}}).blur(0.7).toColourspace("b-w").raw().toBuffer();
  if(envelope.length!==width*height)throw new Error("Erasure mask must have one channel");
  for(let pixel=0;pixel<width*height;pixel++)if(mask[pixel*4+3]>250&&envelope[pixel]<250)throw new Error("Original hand is not fully erased");
  const sample = (buffer, x, y, channel) => {
    if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) return 0;
    const ix = Math.floor(x), iy = Math.floor(y), dx = x - ix, dy = y - iy, p = (iy * width + ix) * 4 + channel;
    return buffer[p] * (1-dx)*(1-dy) + buffer[p+4]*dx*(1-dy) + buffer[p+width*4]*(1-dx)*dy + buffer[p+width*4+4]*dx*dy;
  };
  const strikeTimes=[0.4,1.45,2.8,4.2,5.35,6.7,7.95,9.4,10.8,12.1];
  const arcs=[];
  if(slug === "tesla")for(let strike=0;strike<strikeTimes.length;strike++){
    let seed=104729+strike*7919;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const filament=(start,end,roughness,depth)=>{
      if(depth===0)return[start,end];
      const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy),offset=(random()-0.5)*roughness;
      const mid=[(start[0]+end[0])/2-dy/length*offset,(start[1]+end[1])/2+dx/length*offset];
      return [...filament(start,mid,roughness*0.55,depth-1).slice(0,-1),...filament(mid,end,roughness*0.55,depth-1)];
    };
    const paths=[filament([273,52],[303+random()*12,99+random()*22],20,5),filament([231,53],[207+random()*10,96+random()*25],18,5)];
    const branches=paths.flatMap(path=>[11,22].map(index=>filament(path[index],[path[index][0]+(random()-0.5)*16,path[index][1]+8+random()*12],7,3)));
    const strokes=paths.map(points=>'<polyline points="'+points.map(point=>point.join(',')).join(' ')+'" fill="none"/>').join('');
    const forks=branches.map(points=>'<polyline points="'+points.map(point=>point.join(',')).join(' ')+'" fill="none"/>').join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><defs><filter id="corona"><feGaussianBlur stdDeviation="0.65"/></filter></defs><g stroke="#647dff" stroke-width="1.8" filter="url(#corona)" opacity="0.65">'+strokes+forks+'</g><g stroke="#b1bcff" stroke-width="0.65" opacity="0.85">'+strokes+'</g><g stroke="#f0eeff" stroke-width="0.3">'+strokes+'</g><g stroke="#99a7ff" stroke-width="0.25" opacity="0.55">'+forks+'</g></svg>';
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
      const forward=(x,y)=>[definition.wrist[0]+drift+(x-definition.wrist[0])*cosine-(y-definition.wrist[1])*sine,definition.wrist[1]+lift+(x-definition.wrist[0])*sine+(y-definition.wrist[1])*cosine];
      const jointTop=forward(definition.handJoint[0],definition.handJoint[1]);
      const jointBottom=forward(definition.handJoint[0],definition.handJoint[2]);
      if(slug === "tesla"){
        const seconds=frame/fps, strike=strikeTimes.findIndex(time=>seconds>=time&&seconds<time+0.2);
        const pulse=strike<0?0:Math.pow(1-(seconds-strikeTimes[strike])/0.2,1.5);
        for(let y=0;y<135;y++)for(let x=205;x<width;x++){const p=(y*width+x)*4;for(let c=0;c<3;c++)output[p+c]=original[p+c];if(pulse){const alpha=arcs[strike][p+3]/255*pulse;for(let c=0;c<3;c++)output[p+c]=Math.round(output[p+c]*(1-alpha)+arcs[strike][p+c]*alpha);}}
      }
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const p = (y*width+x)*4, fill = envelope[y*width+x]/255;
        for (let c=0;c<3;c++) output[p+c] = Math.round(original[p+c]*(1-fill)+plate[p+c]*fill);
        // Anatomical wrist: its full 18-20px cross-section joins the fixed cuff
        // to the moving hand. Native skin texture spans a softly tapered shape;
        // the old narrow cylindrical connector and isolated hand are not used.
        const jointX=(jointTop[0]+jointBottom[0])/2;
        if(x>=definition.cuff[0]&&x<jointX){
          const u=(x-definition.cuff[0])/(jointX-definition.cuff[0]);
          const top=definition.cuff[1]*(1-u)+jointTop[1]*u-0.65*Math.sin(Math.PI*u);
          const bottom=definition.cuff[2]*(1-u)+jointBottom[1]*u+0.4*Math.sin(Math.PI*u);
          if(y>=top&&y<bottom){
            const v=(y-top)/(bottom-top),edge=Math.min(1,(y-top)/0.65,(bottom-y)/0.65);
            for(let c=0;c<3;c++)output[p+c]=Math.round(output[p+c]*(1-edge)+sample(original,definition.skinSample[0]+u*1.5,definition.skinSample[1]+v*(definition.skinSample[2]-definition.skinSample[1]),c)*edge);
          }
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
