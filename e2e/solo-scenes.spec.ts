import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function renderedDifference(page: Page, images: string[]) {
  return page.evaluate(async encodedImages=>{
    const pixels=await Promise.all(encodedImages.map(async encoded=>{
      const blob=await (await fetch(`data:image/png;base64,${encoded}`)).blob();
      const bitmap=await createImageBitmap(blob);
      const canvas=document.createElement("canvas");
      canvas.width=bitmap.width; canvas.height=bitmap.height;
      const context=canvas.getContext("2d")!;
      context.drawImage(bitmap,0,0); bitmap.close();
      return context.getImageData(0,0,canvas.width,canvas.height).data;
    }));
    let total=0;
    for(let i=0;i<pixels[0].length;i++) if(i%4!==3) total+=Math.abs(pixels[0][i]-pixels[1][i]);
    return total/(pixels[0].length*0.75);
  },images);
}

async function expectRenderedFlicker(page: Page, light: Locator) {
  const playing=await page.locator("video").evaluateAll(videos=>videos.flatMap((element,index)=>{
    const video=element as HTMLVideoElement, running=!video.paused;
    video.pause();
    return running?[index]:[];
  }));
  const clip=await light.getByTestId("desk-flame-core").boundingBox();
  expect(clip).not.toBeNull();
  // Isolate illumination of the painted flame from the additive glow/core.
  await light.locator(".solo-desk-flame,.solo-desk-flame-core").evaluateAll(elements=>elements.forEach(element=>{(element as SVGElement).style.visibility="hidden";}));
  const frames: string[]=[];
  for(const phase of [0.14,0.79]) {
    await light.evaluate((element,progress)=>{
      for(const animation of element.getAnimations({subtree:true})) {
        const timing=animation.effect!.getTiming();
        animation.pause();
        animation.currentTime=Number(timing.duration)*(1+progress)+(timing.delay??0);
      }
    },phase);
    frames.push((await page.screenshot({clip:clip!})).toString("base64"));
  }
  // Read actual composited pixels; changing CSS values alone can be invisible
  // when a fully bright painted flame sits underneath the animated layer.
  const difference=await renderedDifference(page,frames);
  await light.evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.play()));
  await light.locator(".solo-desk-flame,.solo-desk-flame-core").evaluateAll(elements=>elements.forEach(element=>{(element as SVGElement).style.removeProperty("visibility");}));
  await page.locator("video").evaluateAll((videos,indices)=>Promise.all(indices.map(index=>(videos[index] as HTMLVideoElement).play())),playing);
  await test.info().attach("rendered candle brightness",{body:JSON.stringify({difference}),contentType:"application/json"});
  expect(difference,"flame pixels should visibly brighten and dim").toBeGreaterThan(8);
}

async function expectAcademyDetails(page: Page, scene: Locator) {
  await scene.locator("video").evaluateAll(videos=>videos.forEach(element=>(element as HTMLVideoElement).pause()));
  await scene.evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.pause()));
  const terrace=scene.getByTestId("academy-porch-lights").locator('[data-light^="terrace-"]');
  await expect(terrace).toHaveCount(7);
  const lamps=[scene.locator("rect.solo-candle-light").first(),...await terrace.locator("ellipse.solo-candle-light").all()];
  for(const lamp of lamps) {
    const bounds=(await lamp.boundingBox())!;
    const clip={x:bounds.x-3,y:bounds.y-3,width:bounds.width+6,height:bounds.height+6};
    const frames: string[]=[];
    for(const phase of [0.41,0.57]) {
      await lamp.evaluate((element,progress)=>{
        for(const animation of element.parentElement!.getAnimations({subtree:true})) {
          const timing=animation.effect!.getTiming();
          animation.currentTime=Number(timing.duration)*(5+progress)+(timing.delay??0);
        }
      },phase);
      frames.push((await page.screenshot({clip})).toString("base64"));
    }
    const fixture=await lamp.locator("..").getAttribute("data-light")??"indoor window";
    expect(await renderedDifference(page,frames),`${fixture} should visibly flicker through the frame`).toBeGreaterThan(10);
  }
  const clouds=scene.getByTestId("academy-clouds"),bounds=(await scene.boundingBox())!;
  const clip={x:bounds.x+bounds.width*0.4,y:bounds.y,width:bounds.width*0.6,height:bounds.height*0.3};
  const visible=(await page.screenshot({clip})).toString("base64");
  await clouds.evaluate(element=>{(element as SVGElement).style.visibility="hidden";});
  const hidden=(await page.screenshot({clip})).toString("base64");
  expect(await renderedDifference(page,[visible,hidden]),"clouds should contribute visible sky pixels through the window frame").toBeGreaterThan(1);
  await clouds.evaluate(element=>{(element as SVGElement).style.removeProperty("visibility");});
  await scene.evaluate(element=>element.getAnimations({subtree:true}).forEach(animation=>animation.play()));
  await scene.locator("video").evaluateAll(videos=>Promise.all(videos.map(element=>(element as HTMLVideoElement).play())));
}

test("solo POV preserves choices, fills the window, pauses motion and leaves the timer intact", async ({ page, baseURL }) => {
  test.setTimeout(90000);
  // Existing local preview cookie isolates this UI test from the login journey.
  const environment=readFileSync(new URL("../.env.local",import.meta.url),"utf8");
  const value=(key:string)=>environment.match(new RegExp(`^${key}=(.*)$`,"m"))?.[1].trim().replace(/^["']|["']$/g,"")??"";
  const payload=Buffer.from(JSON.stringify({id:randomUUID(),username:value("DEV_ADMIN_USERNAME"),expiresAt:Date.now()+600000})).toString("base64url");
  const signature=createHmac("sha256",value("DEV_ADMIN_SESSION_SECRET")).update(payload).digest("base64url");
  await page.context().addCookies([{name:"ss_dev_admin",value:`${payload}.${signature}`,url:baseURL!}]);
  await page.emulateMedia({reducedMotion:"no-preference"});
  const errors:string[]=[];
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  await page.goto("/settings");
  const settings=page.getByTestId("solo-scene-settings");
  await settings.getByRole("combobox",{name:"Study table",exact:true}).selectOption("pirate");
  await settings.getByRole("combobox",{name:"Window view",exact:true}).selectOption("waterfall");
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("ss_profile")??"{}").soloScene)).toEqual({desk:"pirate",window:"waterfall"});
  await page.goto("/study");
  const scene=page.getByTestId("solo-study-scene");
  await expect(scene).toHaveCount(0);
  await page.getByRole("button",{name:"Start",exact:true}).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({timeout:20000});
  await expect(scene).toHaveAttribute("data-frame","elven");
  await page.getByRole("button",{name:"Choose companions",exact:true}).click();
  const picker=page.getByTestId("solo-scene-picker");
  await expect(picker.getByRole("button")).toHaveCount(18);
  await expect(picker.getByRole("button",{name:"Waterfall",exact:true})).toBeVisible();
  await expect(picker.getByRole("button",{name:"Green nature",exact:true})).toHaveCount(0);
  await expect(picker.getByRole("button",{name:"Moving clouds",exact:true})).toHaveCount(0);
  await expect(picker.getByRole("button",{name:"Sherlock’s table",exact:true})).toHaveCount(0);
  await expect(picker.getByRole("button",{name:"Black hole",exact:true})).toHaveCount(0);
  const startedAt=await page.evaluate(()=>JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt);
  for(const [name,slug] of [["Medieval table","medieval"],["Shakespearean table","shakespearean"],["Pirate table","pirate"]]){
    await picker.getByRole("button",{name,exact:true}).click();
    await expect(scene).toHaveAttribute("data-desk",slug);
    const flame=scene.getByTestId("desk-flame-core");
    await expect(flame).toBeVisible();
    const filter=await flame.getAttribute("filter");
    expect(filter).toMatch(/^url\(#.+\)$/);
    await expect(scene.locator("filter").filter({has:page.locator('feGaussianBlur[stdDeviation="1.2"]')})).toHaveCount(1);
    const before=await flame.evaluate(element=>{const style=getComputedStyle(element),matrix=(element as SVGGraphicsElement).getCTM()!;return{opacity:style.opacity,transform:style.transform,anchor:{x:matrix.e,y:matrix.f}};});
    await expect.poll(()=>flame.evaluate(element=>getComputedStyle(element).opacity)).not.toBe(before.opacity);
    await expect.poll(()=>flame.evaluate(element=>getComputedStyle(element).transform)).not.toBe(before.transform);
    expect(await flame.evaluate(element=>{const matrix=(element as SVGGraphicsElement).getCTM()!;return{x:matrix.e,y:matrix.f};})).toEqual(before.anchor);
    await page.getByRole("button",{name:"Close",exact:true}).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectRenderedFlicker(page,scene.getByTestId("solo-desk-light"));
    await page.getByRole("button",{name:"Choose companions",exact:true}).click();
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(startedAt);
  await picker.getByRole("button",{name:"Shakespearean table",exact:true}).click();
  await expect(scene.getByTestId("solo-desk-light").locator(":scope > image")).toHaveCount(1);
  await expect(scene.getByTestId("desk-flame")).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));});
  await expect(scene.getByTestId("desk-flame")).toHaveCount(0);
  await page.evaluate(()=>{Reflect.deleteProperty(document,"hidden");document.dispatchEvent(new Event("visibilitychange"));});
  await expect(scene.getByTestId("desk-flame")).toBeVisible();
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(scene.getByTestId("desk-flame")).toHaveCount(0);
  await expect(scene.getByTestId("solo-desk-light").locator(":scope > image")).toHaveCount(1);
  await page.emulateMedia({reducedMotion:"no-preference"});
  await expect(scene.getByTestId("desk-flame")).toBeVisible();
  await picker.getByRole("button",{name:"Shakespearean table",exact:true}).click();
  await expect(scene).toHaveAttribute("data-desk","none");
  await expect(scene.locator(".solo-desk")).toHaveCount(0);
  await expect(scene.getByTestId("solo-desk-light")).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("ss_profile")??"{}").soloScene.desk)).toBe("none");
  await page.reload();
  await expect(scene).toHaveAttribute("data-desk","none");
  await expect(scene.locator(".solo-desk")).toHaveCount(0);
  await page.getByRole("button",{name:"Choose companions",exact:true}).click();
  await picker.getByRole("button",{name:"Magic academy",exact:true}).click();
  await expect(scene.getByTestId("academy-lights").locator("rect.solo-candle-light")).toHaveCount(16);
    await expect(scene.getByTestId("academy-porch-lights").locator("ellipse.solo-candle-light")).toHaveCount(11);
  const lamp=scene.getByTestId("academy-lights").locator("rect.solo-candle-light").first();
    expect(await lamp.evaluate(el=>parseFloat(getComputedStyle(el).animationDuration))).toBeGreaterThanOrEqual(8);
    expect(await lamp.evaluate(el=>parseFloat(getComputedStyle(el).animationDuration))).toBeLessThanOrEqual(11);
  const porch=scene.getByTestId("academy-porch-lights").locator("ellipse.solo-candle-light").first();
  expect(await porch.evaluate(el=>parseFloat(getComputedStyle(el).animationDuration))).toBe(8.5);
  const clouds=scene.getByTestId("academy-clouds");
  await expect(clouds.locator("image")).toHaveCount(2);
  const cloudPosition=await clouds.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>clouds.evaluate(el=>getComputedStyle(el).transform)).not.toBe(cloudPosition);
  await expect.poll(()=>scene.getByTestId("solo-window-video").evaluate(element=>(element as HTMLVideoElement).playbackRate)).toBe(0.8);
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectAcademyDetails(page,scene);
  await page.screenshot({path:test.info().outputPath("academy.png")});
  await page.getByRole("button",{name:"Choose companions",exact:true}).click();
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));});
  await expect(scene).toHaveAttribute("data-motion","paused");
  await expect(clouds).toHaveCSS("animation-play-state","paused");
  await expect(lamp).toHaveCSS("animation-play-state","paused");
  await page.evaluate(()=>{Reflect.deleteProperty(document,"hidden");document.dispatchEvent(new Event("visibilitychange"));});
  await expect(scene).toHaveAttribute("data-motion","running");
  const brightness=await lamp.evaluate(el=>getComputedStyle(el).opacity);
  await expect.poll(()=>lamp.evaluate(el=>getComputedStyle(el).opacity)).not.toBe(brightness);
  await picker.getByRole("button",{name:"Underwater",exact:true}).click();
  const fish=scene.getByTestId("underwater-fish").locator("[data-fish-pass='0']");
  await expect(fish).toBeVisible();
  const fishPosition=await fish.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>fish.evaluate(el=>getComputedStyle(el).transform)).not.toBe(fishPosition);
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(scene.getByTestId("underwater-fish")).toHaveCount(0);
  await page.emulateMedia({reducedMotion:"no-preference"});
  await picker.getByRole("button",{name:"Sailing ships",exact:true}).click();
  await expect(scene.getByTestId("sailing-ship-layers").locator("image")).toHaveCount(2);
  const position = await scene.locator(".solo-sailing-ship-near").evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>scene.locator(".solo-sailing-ship-near").evaluate(el=>getComputedStyle(el).transform)).not.toBe(position);
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(scene.getByTestId("sailing-ship-layers")).toHaveCount(0);
  await page.emulateMedia({reducedMotion:"no-preference"});
  await picker.getByRole("button",{name:"Waterfall",exact:true}).click();
  await picker.getByRole("button",{name:"Modern table",exact:true}).click();
  await picker.getByRole("button",{name:"Pirate table",exact:true}).click();
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await expect(scene.getByTestId("solo-window-video")).toBeVisible();
  await expect.poll(()=>scene.getByTestId("solo-window-video").evaluate(el=>(el as HTMLVideoElement).playbackRate)).toBe(0.65);
  // Native photographed motion must not pass through the rejected image-warp shader.
  await expect(scene.locator("canvas")).toHaveCount(0);
  await expect.poll(()=>scene.getByTestId("solo-window-video").evaluate(element=>(element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.1);
  for(const size of [{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(size);
    const bounds=await page.getByTestId("solo-window").boundingBox();
    expect(bounds!.width*bounds!.height/(size.width*size.height)).toBeGreaterThan(0.6);
    const table=scene.locator(".solo-desk"),tableBounds=await table.boundingBox();
    expect(tableBounds!.width).toBe((await scene.boundingBox())!.width);
    const ratio=await table.evaluate(element=>{const image=element as HTMLImageElement;return image.naturalWidth/image.naturalHeight;});
    expect(tableBounds!.width/tableBounds!.height).toBeCloseTo(ratio,2);
    expect(await scene.locator("img").evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(scene).toHaveAttribute("data-motion","paused");
  await expect(scene.locator("video")).toHaveCount(0);
  await expect(page.getByTestId("session-screen")).toBeVisible({timeout:20000});
  await expect(page.getByTestId("session-bottom-backplate")).toHaveCSS("height","64px");
  expect(await scene.locator(".solo-desk").evaluate(element=>Number(getComputedStyle(element).zIndex))).toBeGreaterThan(10);
  expect(errors.filter(message=>/same key|unique.*key/i.test(message))).toEqual([]);
  const snapshot=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("ss_sessions")!)[0];return {id:s.id,startedAt:s.startedAt};});
  const before=await snapshot();
  await page.reload();
  await expect(scene).toHaveAttribute("data-desk","pirate");
  expect(await snapshot()).toEqual(before);
  await page.getByRole("button",{name:"Finish",exact:true}).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
});
