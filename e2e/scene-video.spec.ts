import { existsSync } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { expect, test } from "@playwright/test";
import { signIn } from "./sessionFixtures";

let webm: Buffer;
let poster: Buffer;
const ownedFiles: string[] = [];
const root = resolve("public/characters/rain-desk");

test.beforeAll(async ({ browser }) => {
  // Synthetic canvas fixture only: no camera, microphone or user media.
  const page = await browser.newPage();
  const fixture = await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 180;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#315c70"; context.fillRect(0, 0, 320, 180);
    const jpeg = canvas.toDataURL("image/jpeg").split(",")[1];
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const recording = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" })); });
    recorder.start();
    const paint = setInterval(() => { context.fillStyle = context.fillStyle === "#315c70" ? "#936b42" : "#315c70"; context.fillRect(0, 0, 320, 180); }, 100);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    clearInterval(paint); recorder.stop();
    const bytes = new Uint8Array(await (await recording).arrayBuffer());
    stream.getTracks().forEach((track) => track.stop());
    return { jpeg, video: btoa(String.fromCharCode(...bytes)) };
  });
  await page.close();
  webm = Buffer.from(fixture.video, "base64"); poster = Buffer.from(fixture.jpeg, "base64");
  await mkdir(root, { recursive: true });
  for (const [name, body] of [["loop.webm", webm], ["poster.jpg", poster]] as const) {
    const path = join(root, name);
    if (!existsSync(path)) { await writeFile(path, body); ownedFiles.push(path); }
  }
});
test.afterAll(async () => {
  // Delete only the exact fixture files this suite created; retain user assets.
  for (const path of ownedFiles) { if (resolve(path).startsWith(`${root}\\`) || resolve(path).startsWith(`${root}/`)) await unlink(path); }
});
test.beforeEach(async ({ page }) => {
  await page.route("**/characters/rain-desk/loop.webm", (route) => route.fulfill({ status: 200, contentType: "video/webm", body: webm }));
  await page.route("**/characters/rain-desk/poster.jpg", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: poster }));
});

test("poster and looping muted video paint, pause hidden, and retain the same node on rerender", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page); await page.goto("/study");
  const scene = page.getByTestId("scene-video"); const movie = scene.locator("video");
  await expect(scene.locator("img")).toHaveCSS("opacity", "1");
  await expect(movie).toHaveCSS("opacity", "1");
  expect(await movie.evaluate((element: HTMLVideoElement) => element.muted && element.loop && element.playsInline && element.autoplay && !element.paused)).toBe(true);
  await expect(movie).toHaveAttribute("preload", "auto");
  const node = await movie.elementHandle();
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  expect(await node!.evaluate((element) => element.isConnected && element === document.querySelector("video"))).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  expect(await movie.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => movie.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  const response = await page.request.get("/characters/rain-desk/poster.jpg");
  expect(response.headers()["cache-control"]).toContain("max-age=31536000");
  expect(response.headers()["cache-control"]).toContain("immutable");
});

test("OS and profile reduced motion show a static poster and never mount video", async ({ page }) => {
  await signIn(page); await page.goto("/study");
  const scene = page.getByTestId("scene-video");
  await expect(scene.locator("img")).toHaveCSS("opacity", "1");
  await expect(scene.locator("video")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(scene.locator("video")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene.locator("video")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("ss_profile", JSON.stringify({ displayName: "", selectedCharacter: "rain-desk", timezone: "UTC", showStreak: true, reduceMotion: true, webcamEnabled: false, ambienceEnabled: false })));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(scene.locator("img")).toHaveCSS("opacity", "1");
  await expect(scene.locator("video")).toHaveCount(0);
});

test("a missing character has an immediate gradient with no missing-media requests or console errors", async ({ page }) => {
  const errors: string[] = []; const requests: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.url().includes("/characters/night-shift/")) requests.push(request.url()); });
  await signIn(page);
  await page.evaluate(() => localStorage.setItem("ss_profile", JSON.stringify({ displayName: "", selectedCharacter: "night-shift", timezone: "UTC", showStreak: false, reduceMotion: false, webcamEnabled: false, ambienceEnabled: false })));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/study");
  const scene = page.getByTestId("scene-video");
  await expect(scene).toHaveAttribute("data-character", "night-shift");
  await expect(scene.locator("img, video")).toHaveCount(0);
  expect(await scene.getByTestId("scene-gradient").evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe("none");
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test("slow video leaves the poster and Start usable, and media errors leave the fallback visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signIn(page);
  await page.unroute("**/characters/rain-desk/loop.webm");
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/characters/rain-desk/loop.webm", async (route) => { await blocked; await route.fulfill({ status: 200, contentType: "video/webm", body: webm }).catch(() => {}); });
  await page.goto("/study", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("scene-video").locator("img")).toHaveCSS("opacity", "1");
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  release();
  const scene = page.getByTestId("scene-video");
  const movie = scene.locator("video");
  await expect(movie).toHaveCSS("opacity", "1");
  await movie.dispatchEvent("error");
  await expect(movie).toHaveCSS("opacity", "0");
  await expect(scene.locator("img")).toHaveCSS("opacity", "1");
  await scene.locator("img").dispatchEvent("error");
  await expect(scene.locator("img")).toHaveCSS("opacity", "0");
  expect(await scene.getByTestId("scene-gradient").evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe("none");
});
