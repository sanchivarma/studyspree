import sharp from 'sharp';
import {access, writeFile} from 'node:fs/promises';
const directory='public/characters/realistic-01';
const names=['study-v10-review.gif','action-v10-review.gif'];
for(const name of names) {
 try { await access(`${directory}/${name}`); throw new Error(`Immutable review asset exists: ${name}`); }
 catch(error) { if(error.code!=='ENOENT') throw error; }
}
const sheet='docs/page-turns/realistic-01-dense-sheet.png';
const frames=[];
for(let i=0;i<42;i++) {
 const c=i%6,r=Math.floor(i/6),left=Math.round(c*1448/6),right=Math.round((c+1)*1448/6);
 frames.push(await sharp(sheet).extract({left:left+2,top:r*150+2,width:right-left-4,height:146}).resize(320,240).png().toBuffer());
}
const mask=Buffer.from('<svg width="320" height="240"><defs><linearGradient id="m" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".58" stop-color="white" stop-opacity="0"/><stop offset=".63" stop-color="white" stop-opacity="1"/><stop offset="1" stop-color="white"/></linearGradient></defs><rect width="320" height="240" fill="url(#m)"/></svg>');
const sequence=[];
for(const frame of frames) {
 const patch=await sharp(frame).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 sequence.push(await sharp(frames[0]).composite([{input:patch}]).ensureAlpha().raw().toBuffer());
}
// No optical flow, cross-dissolves, or generated in-between frames.
const delays=Array(42).fill(50);delays[0]=17000;delays[41]=12000;
for(const [index,name] of names.entries()) {
 const bytes=await sharp(Buffer.concat(sequence),{raw:{width:320,height:240*42,pageHeight:240,channels:4}}).gif({loop:0,delay:index===0?delays:Array(42).fill(80),colours:128,keepDuplicateFrames:true}).toBuffer();
 const metadata=await sharp(bytes,{animated:true}).metadata();
 if(bytes.length>2*1024*1024 || metadata.pages!==42 || metadata.loop!==0) throw new Error('Invalid review GIF');
 await writeFile(`${directory}/${name}`,bytes,{flag:'wx'});
}
console.log('Arun review only: 42 native poses. Not enabled in the registry.');
