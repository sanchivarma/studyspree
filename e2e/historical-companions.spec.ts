import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

for (const scientist of ["tesla", "einstein"]) test(`${scientist} uses a gently moving thirteen-second muted loop with a quiet seam`, async ({ page }) => {
  await page.goto("/login");
  for (const extension of ["mp4", "webm"]) {
    const result = await page.evaluate(async ({ extension, scientist }) => {
      const video = document.createElement("video");
      video.muted = true;
      video.style.cssText = "position:fixed;top:0;left:0;width:320px;height:240px;z-index:9999";
      document.body.append(video);
      video.src = `/characters/${scientist}/study-v27.${extension}`;
      await new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error("Video did not decode")); });
      const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 120;
      const context = canvas.getContext("2d")!;
      const sample = async (time: number) => {
        const rendered = new Promise<void>(resolve => video.requestVideoFrameCallback(() => resolve()));
        await new Promise<void>(resolve => { video.onseeked = () => resolve(); video.currentTime = time; });
        await rendered;
        context.drawImage(video, 0, 0, 160, 120);
        return context.getImageData(0, 0, 160, 120).data;
      };
      const frames = [];
      for (const time of [0.05, 0.1, 8, 12.9]) frames.push(await sample(time));
      const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray, bounds = [0,0,160,120]) => {
        let total = 0, count = 0;
        for(let y=bounds[1];y<bounds[3];y++)for(let x=bounds[0];x<bounds[2];x++)for(let channel=0;channel<3;channel++){const pixel=(y*160+x)*4+channel;total+=Math.abs(a[pixel]-b[pixel]);count++;}
        return total/count;
      };
      const result = { duration: video.duration, adjacent: difference(frames[0], frames[1]), movement: difference(frames[0], frames[2]), // Measure the face itself, excluding the intentionally animated background.
        face: difference(frames[0], frames[2], [55,32,82,62]), writing: difference(frames[0],frames[2],scientist === "einstein" ? [42,67,75,94] : [30,80,105,104]), background: difference(frames[0],frames[2],[108,20,157,62]), seam: difference(frames[0], frames[3]) };
      video.removeAttribute("src"); video.load(); video.remove();
      return result;
    }, { extension, scientist });
    expect(result.duration).toBeGreaterThanOrEqual(12.9);
    expect(result.duration).toBeLessThan(13.1);
    expect(result.adjacent).toBeLessThan(0.5);
    expect(result.movement).toBeGreaterThan(0.01);
    expect(result.writing).toBeGreaterThan(0.2);
    expect(result.background).toBeGreaterThan(0.05);
    expect(result.face).toBeLessThan(1);
    expect(result.seam).toBeLessThan(1.5);
  }
});

test("historical partners animate, persist and leave the session timer intact", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: () => { throw new Error("Character study must not request a camera"); } });
  });
  await signIn(page);
  await page.goto("/study");
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByRole("button", { name: "Historical & medieval", exact: true }).click();
  const slugs = ["medieval-scholar", "medieval-scribe", "einstein", "tesla"];
  for (const slug of slugs) await page.getByTestId(`character-card-${slug}`).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByTestId("character-card-male-01").click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  const snapshot = () => page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("ss_sessions")!)[0];
    return { id: session.id, startedAt: session.startedAt, companions: session.companions };
  });
  const before = await snapshot();
  expect(before.companions.characterSlugs).toEqual(slugs);
  for (const slug of slugs) {
    const tile = page.getByTestId("session-companions").getByTestId(`character-loop-${slug}`);
    await expect(tile.getByTestId("character-animation")).toBeVisible();
    const animation = tile.getByTestId("character-animation");
    await expect.poll(() => animation.evaluate(img => img instanceof HTMLVideoElement ? img.videoWidth : (img as HTMLImageElement).naturalWidth)).toBe(320);
    const firstFrame = await animation.screenshot();
    await expect.poll(async () => (await animation.screenshot()).equals(firstFrame), { timeout: 30000, intervals: [500] }).toBe(false);
  }
  await page.reload();
  await expect(page.getByTestId("session-screen")).toBeVisible();
  expect(await snapshot()).toEqual(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("session-companions").getByTestId("character-animation")).toHaveCount(0);
  await page.mouse.move(20, 20);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
});
