import { expect, it } from "vitest";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { defaultSoloScene, deskSlugs, windowSlugs, deskSource, windowSource, windowVideoSource, windowFrame, soloSceneSchema } from "./catalog";
import { LocalRepository } from "@/lib/repo/local";

it("upgrades old profiles, remembers independent choices, and preserves the running timer", async () => {
  const values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
  const repo=new LocalRepository(()=>storage);
  const legacy={...await repo.getProfile()} as Record<string,unknown>;delete legacy.soloScene;
  storage.setItem("ss_profile",JSON.stringify(legacy));
  expect((await repo.getProfile()).soloScene).toEqual(defaultSoloScene);
  const active=await repo.startSession({plannedMinutes:5,themeSlug:"rain-desk",task:null});
  await repo.updateProfile({soloScene:{desk:"pirate",window:"waterfall"}});
  expect((await new LocalRepository(()=>storage).getProfile()).soloScene).toEqual({desk:"pirate",window:"waterfall"});
  expect(await repo.getActiveSession()).toEqual(active);
  await repo.updateProfile({soloScene:{desk:"none",window:"waterfall"}});
  expect((await new LocalRepository(()=>storage).getProfile()).soloScene).toEqual({desk:"none",window:"waterfall"});
  expect(await repo.getActiveSession()).toEqual(active);
  await expect(repo.updateProfile({soloScene:{desk:"modern",window:"unknown"} as never})).rejects.toThrow();
});

it("ships nine distinct alpha desks and nine complete views within asset budgets", async () => {
  expect(deskSlugs).toHaveLength(9);expect(windowSlugs).toHaveLength(9);
  for(const slug of deskSlugs){const bytes=readFileSync(`public${deskSource(slug)}`),meta=await sharp(bytes).metadata();expect(bytes.length).toBeLessThan(1500000);expect(meta.hasAlpha).toBe(true);}
  for(const slug of windowSlugs){const bytes=readFileSync(`public${windowSource(slug)}`),meta=await sharp(bytes).metadata();expect(bytes.length).toBeLessThan(1500000);expect(meta.width).toBeGreaterThanOrEqual(1280);}
  expect(windowFrame("magic-academy")).toBe("gothic");expect(windowFrame("waterfall")).toBe("elven");
  expect(windowFrame("underwater")).toBe("submarine");expect(windowFrame("old-castle")).toBe("medieval");expect(windowFrame("sea")).toBe("modern");
  expect(windowVideoSource("old-castle")).toBe("/solo/views/old-castle-filmed-v2.mp4");
  expect(windowVideoSource("mountains")).toBe("/solo/views/mountains-filmed-v2.mp4");
  for(const slug of windowSlugs){
    const bytes=readFileSync(`public${windowVideoSource(slug)}`);
    expect(bytes.length,slug).toBeLessThan(8000000);
    expect(bytes.toString("ascii",4,8),slug).toBe("ftyp");
  }
});

it("upgrades retired window choices without changing the selected desk", () => {
  expect(soloSceneSchema.parse({desk:"pirate",window:"rivendell"})).toEqual({desk:"pirate",window:"waterfall"});
  expect(soloSceneSchema.parse({desk:"scientist",window:"green-nature"})).toEqual({desk:"scientist",window:"sea"});
  expect(windowSlugs).not.toContain("green-nature");
  expect(windowSlugs).not.toContain("rivendell");
  expect(soloSceneSchema.parse({desk:"sherlock",window:"clouds"})).toEqual({desk:"modern",window:"sea"});
  expect(windowSlugs).not.toContain("clouds");
  expect(deskSlugs).not.toContain("sherlock");
  expect(soloSceneSchema.parse({desk:"pirate",window:"blackhole"})).toEqual({desk:"pirate",window:"sea"});
  expect(windowSlugs).not.toContain("blackhole");
  expect(windowFrame("castle-garden")).toBe("georgian");
});
