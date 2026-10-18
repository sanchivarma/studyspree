import sharp from "sharp";
import { access, readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ffmpeg = process.argv[2] ?? "ffmpeg";
const version = process.argv[3] ?? "v20";
if (!/^v\d+$/.test(version)) throw new Error("Invalid immutable version");
const revisions = JSON.parse(await readFile("src/lib/characters/mediaRevisions.json", "utf8"));
const prepared = {};
let ledger = await readFile("public/characters/LICENCES.md", "utf8");
for (const slug of ["einstein", "tesla"]) {
  const root = `public/characters/${slug}`, seconds = 13;
  for (const extension of ["gif","webm","mp4"]) {
    try { await access(`${root}/study-${version}.${extension}`); throw new Error("Immutable output exists"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const source = await readFile(`${root}/study-v14.gif`), metadata = await sharp(source,{animated:true}).metadata();
  const width = metadata.width, height = metadata.pageHeight, stride = width*height*4;
  const raw = await sharp(source,{animated:true}).ensureAlpha().raw().toBuffer(), base = raw.subarray(0,stride);
  const cx = slug === "einstein" ? 277 : 269, cy = slug === "einstein" ? 55 : 80;
  const rx = slug === "einstein" ? 57 : 51, ry = slug === "einstein" ? 40 : 70;
  const pixels = [];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const radius = Math.hypot((x-cx)/rx,(y-cy)/ry), pixel=(y*width+x)*4;
    if(radius>=1 || x<210 || y>150)continue;
    const feather=Math.min(1,(1-radius)/0.25);
    const blue=slug === "tesla" ? Math.max(0,Math.min(1,(base[pixel+2]-base[pixel]-10)/60)) : 1;
    if(feather*blue>0)pixels.push({x,y,pixel,weight:feather*blue});
  }
  const sample=(x,y,channel)=>{
    x=Math.max(0,Math.min(width-1.001,x));y=Math.max(0,Math.min(height-1.001,y));
    const left=Math.floor(x),top=Math.floor(y),dx=x-left,dy=y-top,p=(top*width+left)*4+channel;
    return base[p]*(1-dx)*(1-dy)+base[p+4]*dx*(1-dy)+base[p+width*4]*(1-dx)*dy+base[p+width*4+4]*dx*dy;
  };
  const render=async fps=>{
    const count=seconds*fps,frames=[];
    for(let frame=0;frame<count;frame++) {
      const phase=2*Math.PI*frame/count,angle=slug === "einstein" ? 0.018*Math.sin(phase) : 0;
      // Blend only the existing writing region between native frames. No optical
      // flow or geometry warping: the face, torso and cage remain untouched.
      const position=frame/count*metadata.pages, sourceFrame=Math.floor(position), mix=position-sourceFrame;
      const output=Buffer.from(raw.subarray(sourceFrame*stride,(sourceFrame+1)*stride));
      const region=slug === "einstein" ? [70,143,187,185] : [59,160,210,208];
      for(let y=region[1];y<region[3];y++)for(let x=region[0];x<region[2];x++) {
        const pixel=(y*width+x)*4;
        for(let channel=0;channel<3;channel++) {
          let value=0;
          for(const [offset,weight] of [[-1,0.15],[0,0.7],[1,0.15]]) {
            const a=(sourceFrame+offset+metadata.pages)%metadata.pages,b=(a+1)%metadata.pages;
            value+=weight*(raw[a*stride+pixel+channel]*(1-mix)+raw[b*stride+pixel+channel]*mix);
          }
          output[pixel+channel]=Math.round(value);
        }
      }
      if(slug === "einstein") {
        // Move the pen and writing hand as a rigid patch, feathered into the
        // sleeve/paper. The face and fingers retain their source geometry.
        const original=Buffer.from(output),left=80,right=151,top=135,bottom=187;
        const dx=2.4*Math.sin(phase*4),dy=1.1*Math.sin(phase*8);
        for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
          const weight=Math.max(0,Math.min(1,(x-left)/10,(right-x)/10,(y-top)/8,(bottom-y)/8));
          const sx=x-dx,sy=y-dy,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,p=(y*width+x)*4,q=(iy*width+ix)*4;
          for(let c=0;c<3;c++){const moved=original[q+c]*(1-fx)*(1-fy)+original[q+4+c]*fx*(1-fy)+original[q+width*4+c]*(1-fx)*fy+original[q+width*4+4+c]*fx*fy;output[p+c]=Math.round(original[p+c]*(1-weight)+moved*weight);}
        }
      }
      const cosine=Math.cos(angle),sine=Math.sin(angle),shiftX=1.8*Math.sin(phase),shiftY=0.65*Math.sin(phase*2);
      const gain=slug === "tesla" ? 1+0.08*Math.sin(phase) : 1;
      for(const {x,y,pixel,weight} of pixels) {
        const sx=slug === "einstein" ? cx+(x-cx)*cosine+(y-cy)*sine : x+shiftX;
        const sy=slug === "einstein" ? cy-(x-cx)*sine+(y-cy)*cosine : y+shiftY;
        for(let channel=0;channel<3;channel++) output[pixel+channel]=Math.max(0,Math.min(255,Math.round(base[pixel+channel]*(1-weight)+sample(sx,sy,channel)*weight*gain)));
      }
      if(slug === "tesla") {
        // Discharges are anchored to the toroid behind Tesla. Their branches
        // breathe and bend smoothly; neither the tower nor the face flickers.
        const paths=[[[275,53],[289,64],[282,73],[301,86],[293,95],[311,112]],[[231,53],[218,65],[226,74],[211,87],[219,98],[210,119]],[[281,46],[301,51],[296,60],[313,67]]];
        const lines=paths.map((points,index)=>points.map(([x,y],i)=>{const bend=i===0?0:Math.sin(phase*2+i*0.8+index)*2;return [x+bend,y+(i===0?0:Math.sin(phase*2+i)*0.8)].join(',');}).join(' '));
        const opacity=0.52+0.12*Math.sin(phase*2);
        const strokes=lines.map(points=>'<polyline points="'+points+'" fill="none" stroke-linecap="round" stroke-linejoin="round"/>').join('');
        const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><g stroke="#5d9dff" stroke-width="4" opacity="'+opacity*0.22+'">'+strokes+'</g><g stroke="#91caff" stroke-width="1.5" opacity="'+opacity+'">'+strokes+'</g><g stroke="#e2f7ff" stroke-width="0.55" opacity="'+opacity+'">'+strokes+'</g></svg>';
        const overlay=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
        for(let y=40;y<125;y++)for(let x=205;x<320;x++){const p=(y*width+x)*4,a=overlay[p+3]/255;if(a)for(let c=0;c<3;c++)output[p+c]=Math.round(output[p+c]*(1-a)+overlay[p+c]*a);}
      }
      frames.push(output);
    }
    return Buffer.concat(frames);
  };
  const gif=process.argv.includes("--reuse-v15") ? await readFile(`${root}/study-v15.gif`) : await sharp(await render(20),{raw:{width,height:height*seconds*20,channels:4,pageHeight:height}})
    .gif({loop:0,delay:Array(seconds*20).fill(50),colours:256,effort:7,keepDuplicateFrames:true}).toBuffer();
  if(gif.length>2097152)throw new Error(`GIF budget exceeded: ${slug}`);
  const gifMetadata=await sharp(gif,{animated:true}).metadata();
  if(gifMetadata.pages!==260 || gifMetadata.delay.some(ms=>ms!==50))throw new Error(`Invalid GIF preview cadence: ${slug}`);
  await writeFile(`${root}/study-${version}.gif`,gif,{flag:"wx"});
  const videoRaw=process.argv.includes("--reuse-video-v16") ? null : await render(30);
  for(const extension of ["mp4","webm"]) {
    if(!videoRaw){await copyFile(`${root}/study-v16.${extension}`,`${root}/study-${version}.${extension}`);continue;}
    if(extension === "webm" && process.argv.includes("--reuse-v15")){await copyFile(`${root}/study-v15.webm`,`${root}/study-${version}.webm`);continue;}
    const codec=extension === "mp4" ? ["-c:v","libx264","-crf","14","-g","30","-bf","0","-movflags","+faststart"] : ["-c:v","libvpx-vp9","-crf","32","-b:v","0"];
    const result=spawnSync(ffmpeg,["-hide_banner","-loglevel","error","-n","-f","rawvideo","-pixel_format","rgba","-video_size",`${width}x${height}`,"-framerate","30","-i","pipe:0","-an",...codec,"-pix_fmt","yuv420p",`${root}/study-${version}.${extension}`],{input:videoRaw,windowsHide:true,encoding:"buffer",maxBuffer:1048576});
    if(result.status!==0)throw new Error(result.error?.message || result.stderr?.toString() || "Video encoding error");
  }
  prepared[slug]={...revisions[slug],version,loopSeconds:seconds,gifSeconds:seconds,gifFrames:260,gifDelays:Array(260).fill(50),sourceVersion:"v14",sourceSha256:createHash("sha256").update(source).digest("hex"),resampledFrames:true,writingSmoothing:"localized-temporal-blend-visible-pen-strokes",backgroundMotion:slug === "einstein" ? "one-degree-periodic-orbit" : "tower-anchored-smooth-lightning-branches"};
  for(const extension of ["gif","mp4","webm"])ledger+=`\n| ${slug}/study-${version}.${extension} | studyspree-ai-${slug}-${version} | Original v14 writing frames with slow periodic background-only motion; scripts/animate-scientist-backgrounds.mjs | Original generated project artwork; original source terms apply | 2026-10-18 | subject to generation-service terms |`;
  console.log(`${slug}: prepared 13-second loop, 30fps video/20fps GIF, ${gif.length} GIF bytes`);
}
// Activation is separate so browser/privacy checks are not interrupted by HMR.
await writeFile(`.tmp/scientist-background-${version}.json`,JSON.stringify(prepared,null,2)+"\n");
await writeFile("public/characters/LICENCES.md",ledger+"\n");
