import sharp from "sharp";
import { access, mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
const ffmpeg=process.argv[2]??"ffmpeg";
const slugs=["old-castle","castle-garden","green-nature","clouds","sailing-ships","sea","mountains","space","underwater","magic-academy","rivendell"];
await mkdir(".tmp/solo-motion",{recursive:true});
const stars=Array.from({length:80},(_,i)=>`<circle cx="${(i*137+31)%1280}" cy="${(i*97+11)%720}" r="${i%4===0?1.1:0.6}" fill="white" opacity="${0.25+(i%4)*0.12}"/>`).join("");
const underwater=Array.from({length:18},(_,i)=>`<circle cx="${(i*149+71)%1280}" cy="${(i*83+37)%720}" r="${1+i%3}" fill="none" stroke="#c3ebfa" stroke-width="0.8" opacity="0.25"/>`).join("");
for(const[name,shapes]of [["stars",stars],["underwater",underwater]])await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">${shapes}</svg>`)).png().toFile(`.tmp/solo-motion/${name}.png`);
const run=args=>new Promise((resolve,reject)=>{const child=spawn(ffmpeg,args,{windowsHide:true,stdio:["ignore","ignore","pipe"]});let error="";child.stderr.on("data",chunk=>{error+=chunk;});child.on("error",reject);child.on("close",code=>code===0?resolve():reject(new Error(error)));});
for(const slug of slugs){
  const target=`public/solo/views/${slug}-motion-v1.mp4`;
  try{await access(target);console.log(`${slug}: existing immutable loop retained`);continue;}catch(error){if(error.code!=="ENOENT")throw error;}
  const source=`public/solo/views/${slug}-${slug==="sailing-ships"?"v2":"v1"}.webp`;
  const celestial=slug==="space", aquatic=slug==="underwater";
  const layer=celestial?".tmp/solo-motion/stars.png":aquatic?".tmp/solo-motion/underwater.png":"public/solo/motion/cloud-overlay-v1.webp";
  const imageArgs=path=>["-loop","1","-framerate","24","-i",path];
  let filter=celestial||aquatic
    ? `[0:v]scale=1280:720,setsar=1,format=rgba[b];[1:v]format=rgba[m];[b][m]overlay=x='3*sin(2*PI*t/24)':y='${aquatic?12:3}*sin(2*PI*t/24)'[scene]`
    : "[0:v]scale=1280:720,setsar=1,format=rgba[b];[1:v]scale=1400:210,format=rgba,colorchannelmixer=aa=0.22[m];[b][m]overlay=x='-60+24*sin(2*PI*t/24)':y='-30+3*cos(2*PI*t/24)'[scene]";
  const inputs=[...imageArgs(source),...imageArgs(layer)];
  if(slug==="sailing-ships"){
    inputs.push(...imageArgs("public/solo/motion/ship-overlay-v2.webp"));
    filter+=";[2:v]scale=125:100,format=rgba,colorchannelmixer=aa=0.8[ship];[scene][ship]overlay=x='580+28*sin(2*PI*t/24)':y='285+0.5*sin(4*PI*t/24)'[out]";
  }else filter+=";[scene]null[out]";
  await run(["-hide_banner","-loglevel","error","-n",...inputs,"-filter_complex",filter,"-map","[out]","-t","24","-an","-c:v","libx264","-preset","veryfast","-crf","23","-threads","2","-filter_complex_threads","1","-pix_fmt","yuv420p","-movflags","+faststart",target]);
  const bytes=(await stat(target)).size;if(bytes>8000000)throw new Error(`${slug}: video exceeds 8 MB`);
  console.log(`${slug}: 24s muted loop, ${bytes} bytes`);
}
