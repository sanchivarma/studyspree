import { expect, test } from "@playwright/test";
import { windowSlugs, windowVideoSource } from "../src/lib/soloScenes/catalog";

test("all ten local outdoor MP4s decode with motion and quiet loop seams",async({page})=>{
  test.setTimeout(120000);
  await page.goto("/login");
  for(const slug of windowSlugs){
    const src=windowVideoSource(slug);
    const response=await page.request.get(src);
    expect(response.ok(),slug).toBe(true);expect((await response.body()).length,slug).toBeLessThan(8000000);
    expect(response.headers()["content-type"],`${slug}: public media must not redirect to login HTML`).toContain("video/mp4");
    const result=await page.evaluate(async ({src,slug})=>{
      const video=document.createElement("video");video.muted=true;video.playsInline=true;video.preload="auto";document.body.append(video);
      const loaded=new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error(`Media decode error: ${src}`));});
      video.src=src;video.load();await loaded;
      const canvas=document.createElement("canvas");canvas.width=160;canvas.height=90;const context=canvas.getContext("2d")!;
      const sample=async(time:number)=>{const rendered=new Promise<void>(resolve=>video.requestVideoFrameCallback(()=>resolve()));await new Promise<void>(resolve=>{video.onseeked=()=>resolve();video.currentTime=time;});await rendered;context.drawImage(video,0,0,160,90);return context.getImageData(0,0,160,90).data;};
      // Inspect the actual first/last encoded frames, rather than two frames
      // 100 ms apart across the join (which includes normal scenery movement).
      const frames=[];for(const time of [0.001,0.05,video.duration*0.4,video.duration-0.001])frames.push(await sample(time));
      const difference=(a:Uint8ClampedArray,b:Uint8ClampedArray)=>{let sum=0;for(let i=0;i<a.length;i++)if(i%4!==3)sum+=Math.abs(a[i]-b[i]);return sum/(160*90*3);};
      // The two layered scenes must animate their sky/water without moving
      // the original castle/coast. Compare protected architecture pixels.
      let architectureDifference:number|null=null;
      if(slug==="magic-academy"||slug==="sailing-ships"){
        const region=slug==="magic-academy"?[16,27,38,25]:[16,20,20,20];let sum=0,count=0;
        for(let y=region[1];y<region[1]+region[3];y++)for(let x=region[0];x<region[0]+region[2];x++){
          const i=(y*160+x)*4;for(let c=0;c<3;c++){sum+=Math.abs(frames[0][i+c]-frames[2][i+c]);count++;}
        }
        architectureDifference=sum/count;
      }
      const result={width:video.videoWidth,height:video.videoHeight,duration:video.duration,adjacent:difference(frames[0],frames[1]),motion:difference(frames[0],frames[2]),seam:difference(frames[0],frames[3]),architectureDifference};
      video.removeAttribute("src");video.load();video.remove();return result;
    },{src,slug});
    expect(result.width,slug).toBe(1280);expect(result.height,slug).toBe(720);
    // Filmed sources retain their timing; the slow full Earth rotation is two minutes.
    expect(result.duration,slug).toBeGreaterThan(4);expect(result.duration,slug).toBeLessThan(121);
    expect(result.motion,slug).toBeGreaterThan(0.00001);
    // Real flowing water changes more pixels than the rejected drifting overlays.
    // A seam must remain comparable to normal adjacent photographed frames.
    expect(result.adjacent,slug).toBeLessThan(5);
    expect(result.seam,slug).toBeLessThan(Math.max(1.5,result.adjacent*4));
    if(result.architectureDifference!==null)expect(result.architectureDifference,`${slug}: stationary architecture`).toBeLessThan(1.5);
  }
});
