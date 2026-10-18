import { expect, test } from "@playwright/test";
import { windowSlugs } from "../src/lib/soloScenes/catalog";

test("all twelve local outdoor MP4s decode with motion and quiet loop seams",async({page})=>{
  test.setTimeout(120000);
  await page.goto("/login");
  for(const slug of windowSlugs){
    const response=await page.request.get(`/solo/views/${slug}-motion-v1.mp4`);
    expect(response.ok(),slug).toBe(true);expect((await response.body()).length,slug).toBeLessThan(8000000);
    const result=await page.evaluate(async slug=>{
      const video=document.createElement("video");video.muted=true;video.playsInline=true;video.src=`/solo/views/${slug}-motion-v1.mp4`;document.body.append(video);
      await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error("Media decode error"));});
      const canvas=document.createElement("canvas");canvas.width=160;canvas.height=90;const context=canvas.getContext("2d")!;
      const sample=async(time:number)=>{const rendered=new Promise<void>(resolve=>video.requestVideoFrameCallback(()=>resolve()));await new Promise<void>(resolve=>{video.onseeked=()=>resolve();video.currentTime=time;});await rendered;context.drawImage(video,0,0,160,90);return context.getImageData(0,0,160,90).data;};
      const frames=[];for(const time of [0.05,0.1,6,23.95])frames.push(await sample(time));
      const difference=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>{let sum=0;for(let i=0;i<a.length;i++)if(i%4!==3)sum+=Math.abs(a[i]-b[i]);return sum/(160*90*3);};
      const result={width:video.videoWidth,height:video.videoHeight,duration:video.duration,adjacent:difference(frames[0],frames[1]),motion:difference(frames[0],frames[2]),seam:difference(frames[0],frames[3])};
      video.removeAttribute("src");video.load();video.remove();return result;
    },slug);
    expect(result.width,slug).toBe(1280);expect(result.height,slug).toBe(720);
    expect(result.duration,slug).toBeCloseTo(24,1);
    expect(result.motion,slug).toBeGreaterThan(0.00001);
    expect(result.adjacent,slug).toBeLessThan(0.5);
    expect(result.seam,slug).toBeLessThan(1.5);
  }
});
