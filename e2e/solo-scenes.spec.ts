import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

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
  await settings.getByRole("combobox",{name:"Window view",exact:true}).selectOption("rivendell");
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("ss_profile")??"{}").soloScene)).toEqual({desk:"pirate",window:"rivendell"});
  await page.goto("/study");
  const scene=page.getByTestId("solo-study-scene");
  await expect(scene).toHaveAttribute("data-frame","elven");
  await page.getByRole("button",{name:"Choose companions",exact:true}).click();
  const picker=page.getByTestId("solo-scene-picker");
  await expect(picker.getByRole("button")).toHaveCount(22);
  await picker.getByRole("button",{name:"Modern table",exact:true}).click();
  await picker.getByRole("button",{name:"Pirate table",exact:true}).click();
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await expect(scene.getByTestId("solo-window-video")).toBeVisible();
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
  await page.getByRole("button",{name:"Start",exact:true}).click();
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
