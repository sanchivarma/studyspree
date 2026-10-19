import { expect, it } from "vitest";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { defaultSoloScene, deskSlugs, windowSlugs, deskSource, windowSource, windowVideoSource, windowFrame } from "./catalog";
import { LocalRepository } from "@/lib/repo/local";

it("upgrades old profiles, remembers independent choices, and preserves the running timer", async () => {
  const values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
  const repo=new LocalRepository(()=>storage);
  const legacy={...await repo.getProfile()} as Record<string,unknown>;delete legacy.soloScene;
  storage.setItem("ss_profile",JSON.stringify(legacy));
  expect((await repo.getProfile()).soloScene).toEqual(defaultSoloScene);
  const active=await repo.startSession({plannedMinutes:5,themeSlug:"rain-desk",task:null});
  await repo.updateProfile({soloScene:{desk:"pirate",window:"rivendell"}});
  expect((await new LocalRepository(()=>storage).getProfile()).soloScene).toEqual({desk:"pirate",window:"rivendell"});
  expect(await repo.getActiveSession()).toEqual(active);
  await expect(repo.updateProfile({soloScene:{desk:"modern",window:"unknown"} as never})).rejects.toThrow();
});

it("ships ten distinct alpha desks and twelve complete views within asset budgets", async () => {
  expect(deskSlugs).toHaveLength(10);expect(windowSlugs).toHaveLength(12);
  for(const slug of deskSlugs){const bytes=readFileSync(`public${deskSource(slug)}`),meta=await sharp(bytes).metadata();expect(bytes.length).toBeLessThan(1500000);expect(meta.hasAlpha).toBe(true);}
  for(const slug of windowSlugs){const bytes=readFileSync(`public${windowSource(slug)}`),meta=await sharp(bytes).metadata();expect(bytes.length).toBeLessThan(1500000);expect(meta.width).toBeGreaterThanOrEqual(1280);}
  expect(windowFrame("magic-academy")).toBe("gothic");expect(windowFrame("rivendell")).toBe("elven");
  expect(windowFrame("underwater")).toBe("submarine");expect(windowFrame("old-castle")).toBe("medieval");expect(windowFrame("green-nature")).toBe("modern");
  expect(windowVideoSource("old-castle")).toBe("/solo/views/old-castle-filmed-v2.mp4");
  expect(windowVideoSource("mountains")).toBe("/solo/views/mountains-filmed-v2.mp4");
  for(const slug of windowSlugs){
    const bytes=readFileSync(`public${windowVideoSource(slug)}`);
    expect(bytes.length,slug).toBeLessThan(8000000);
    expect(bytes.toString("ascii",4,8),slug).toBe("ftyp");
  }
});
