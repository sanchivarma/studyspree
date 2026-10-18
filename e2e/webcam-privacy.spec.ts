import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

test.use({ hasTouch: true, launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });
// Account/setup navigation and camera lifecycle checks share this overall
// budget. Keep the independent Start deadline and 20-second network audit.
test.describe.configure({ timeout: 60_000 });

// Use Chromium's synthetic device: tests never access the user's physical camera.
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const audit = { constraints: [] as MediaStreamConstraints[], streams: [] as MediaStream[], violations: [] as string[] };
    Object.assign(window, { cameraAudit: audit });
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      audit.constraints.push(constraints!);
      const stream = await getUserMedia(constraints); audit.streams.push(stream); return stream;
    };
    const block = (name: string) => {
      Object.assign(window, { __violation: true });
      audit.violations.push(name); throw new Error(`Camera privacy boundary: ${name}`);
    };
    const containsStream = (value: unknown, seen = new WeakSet<object>()): boolean => {
      if (value instanceof MediaStream || value instanceof MediaStreamTrack) return true;
      if (typeof value !== "object" || value === null || seen.has(value)) return false;
      seen.add(value);
      return Object.values(value).some(child => containsStream(child, seen));
    };
    const originalFetch = window.fetch;
    window.fetch = (input, init) => { if (containsStream(input) || containsStream(init)) block("fetch"); return originalFetch(input, init); };
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) { if (containsStream(body)) block("XMLHttpRequest"); return originalSend.call(this, body); };
    const socketSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data) { if (containsStream(data)) block("WebSocket"); return socketSend.call(this, data); };
    const beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => { if (containsStream(data)) block("sendBeacon"); return beacon(url, data); };
    for (const name of ["MediaRecorder", "RTCPeerConnection"] as const) {
      Object.defineProperty(window, name, { configurable: true, value: function() { block(name); } });
    }
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(image: CanvasImageSource, ...coordinates: number[]) {
      if (image instanceof HTMLVideoElement && image.srcObject instanceof MediaStream) block("canvas.drawImage");
      return Reflect.apply(drawImage, this, [image, ...coordinates]);
    };
    HTMLCanvasElement.prototype.captureStream = function() { return block("canvas.captureStream"); };
    HTMLCanvasElement.prototype.toBlob = function() { block("canvas.toBlob"); };
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = object => { if (containsStream(object)) block("createObjectURL"); return createObjectURL(object); };
  });
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const value = (window as unknown as { cameraAudit: { constraints: MediaStreamConstraints[]; streams: MediaStream[]; violations: string[] } }).cameraAudit;
    return { constraints: value.constraints, tracks: value.streams.flatMap(stream => stream.getTracks().map(track => ({ kind: track.kind, readyState: track.readyState }))), violations: value.violations };
  });
}

test("privacy contract stays at the file header and the stream code has no transmission APIs", () => {
  const source = readFileSync(new URL("../src/components/webcam/SelfView.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  expect(source.startsWith(`/**\n * PRIVACY CONTRACT\n * This component renders a LOCAL camera preview only. The MediaStream is\n * attached to a <video> element via srcObject and nothing else. It is never\n * uploaded, recorded, sent to a peer, drawn to a canvas for transmission,\n * or passed to any network API. Any change that introduces network access\n * to this stream breaks an explicit promise made to users.\n */`)).toBe(true);
  const hook = readFileSync(new URL("../src/hooks/useLocalCamera.ts", import.meta.url), "utf8");
  expect(hook).toContain('audio: false');
  for (const file of [hook, source.slice(source.indexOf('"use client"'))]) {
    expect(file).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|RTCPeerConnection|MediaRecorder|sendBeacon|captureStream|toBlob|drawImage)\b/);
  }
});

// Permanent privacy regression: CI runs this suite on every push and pull request.
test("privacy constructor guards actually flag attempts to record or connect to a peer", async ({ page }) => {
  await instrument(page); await page.goto("/");
  expect(await page.evaluate(() => (window as unknown as { __violation?: boolean }).__violation)).toBeFalsy();
  await page.evaluate(() => {
    try { new RTCPeerConnection(); } catch { /* The guard deliberately blocks it. */ }
    try { new MediaRecorder(new MediaStream()); } catch { /* No camera is acquired. */ }
  });
  expect(await page.evaluate(() => (window as unknown as { __violation?: boolean }).__violation)).toBe(true);
  expect((await audit(page)).violations).toEqual(["RTCPeerConnection", "MediaRecorder"]);
  expect((await audit(page)).constraints).toHaveLength(0);
});

test("Settings opt-in keeps the camera local throughout twenty seconds of requests", async ({ page }) => {
  test.setTimeout(60_000);
  await instrument(page);
  const requests: { url: string; bodyBytes: number }[] = [];
  const record = (request: import("@playwright/test").Request) => {
    requests.push({ url: request.url(), bodyBytes: request.postDataBuffer()?.byteLength ?? 0 });
  };
  page.on("request", record);
  try {
    await signIn(page); await page.goto("/settings");
    const toggle = page.getByRole("switch", { name: "Self-view", exact: true });
    await expect(toggle).not.toBeChecked(); await toggle.click(); await expect(toggle).toBeChecked();
    await expect.poll(async () => (await audit(page)).constraints.length).toBe(1);
    expect((await audit(page)).constraints).toEqual([{ video: { width: 320, facingMode: "user" }, audio: false }]);
    // Settings requests permission immediately and releases the probe stream.
    await expect.poll(async () => (await audit(page)).tracks.every(track => track.readyState === "ended")).toBe(true);
    expect(await page.evaluate(() => (window as unknown as { __violation?: boolean }).__violation)).toBeFalsy();
    await startSession(page);
    const video = page.getByTestId("local-camera-video");
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
    // Real elapsed time, independent of app/dev clocks; capture every request.
    await page.waitForTimeout(20_000);
    expect(await page.evaluate(() => (window as unknown as { __violation?: boolean }).__violation)).toBeFalsy();
    expect((await audit(page)).violations).toEqual([]);
    const captured = await audit(page);
    // Strict Mode may acquire a cancelled mount's stream too. It must already
    // be stopped; exactly one video track may remain live, with no audio ever.
    expect(captured.tracks.filter(track => track.readyState === "live")).toEqual([{ kind: "video", readyState: "live" }]);
    expect(captured.tracks.every(track => track.kind === "video")).toBe(true);
    expect(captured.constraints.every(constraint => constraint.audio === false)).toBe(true);
    const externalUploads = requests.filter(request => !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname) && request.bodyBytes > 10_000);
    expect(externalUploads).toEqual([]);
    expect(requests.filter(request => /webrtc|stun|turn/i.test(request.url))).toEqual([]);
  } finally { page.off("request", record); }
});

test("Settings releases a late permission stream after navigating away", async ({ page }) => {
  await instrument(page);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = constraints => new Promise((resolve, reject) => {
      Object.assign(window, { resolveCameraPermission: () => original(constraints).then(resolve, reject) });
    });
  });
  await signIn(page); await page.goto("/settings");
  await page.getByRole("switch", { name: "Self-view", exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { resolveCameraPermission?: unknown }).resolveCameraPermission)).toBe("function");
  await page.getByRole("link", { name: "Study", exact: true }).click();
  await expect(page).toHaveURL(/\/study$/);
  await page.evaluate(() => (window as unknown as { resolveCameraPermission: () => Promise<void> }).resolveCameraPermission());
  await expect.poll(async () => (await audit(page)).tracks.every(track => track.readyState === "ended")).toBe(true);
  expect((await audit(page)).tracks).toEqual([{ kind: "video", readyState: "ended" }]);
  expect((await audit(page)).violations).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile") ?? "{}").webcamEnabled ?? false)).toBe(false);
});

test("opt-in attaches video-only media locally, sends no requests, and stops every track on disable", async ({ page }) => {
  await instrument(page); await signIn(page); await startSession(page);
  await page.waitForLoadState("networkidle");
  expect((await audit(page)).constraints).toHaveLength(0);
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  const video = page.getByTestId("local-camera-video");
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  expect(await video.evaluate(element => (element as HTMLVideoElement).srcObject instanceof MediaStream)).toBe(true);
  await expect(video).toHaveCSS("transform", "matrix(-1, 0, 0, 1, 0, 0)");
  await expect(page.getByTestId("self-view")).toHaveClass(/ph-no-capture/);
  const active = await audit(page);
  expect(active.constraints).toEqual([{ video: { width: 320, facingMode: "user" }, audio: false }]);
  expect(active.tracks).toEqual([{ kind: "video", readyState: "live" }]);
  await page.waitForTimeout(1000);
  expect(requests).toEqual([]); expect((await audit(page)).violations).toEqual([]);
  await page.getByRole("button", { name: "Turn camera off", exact: true }).click();
  await expect(video).toHaveCount(0);
  expect((await audit(page)).tracks.every(track => track.readyState === "ended")).toBe(true);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).webcamEnabled)).toBe(false);
});

test("hover expands with transforms, drag snaps to corners, and refresh remembers the corner", async ({ page }) => {
  await instrument(page); await signIn(page); const path = await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByTestId("local-camera-video")).toBeVisible();
  const frame = page.getByTestId("self-view");
  const toggle = page.getByRole("button", { name: "Expand self-view", exact: true });
  expect(await toggle.boundingBox()).toMatchObject({ width: 120, height: 90 });
  const thumbnail = (await toggle.boundingBox())!;
  await page.mouse.move(thumbnail.x + 60, thumbnail.y + 55);
  await expect(frame).toHaveAttribute("data-expanded", "true");
  expect(await page.getByRole("button", { name: "Collapse self-view", exact: true }).boundingBox()).toMatchObject({ width: 320, height: 240 });
  await page.mouse.move(300, 350);
  const handle = page.getByRole("button", { name: "Move self-view", exact: true });
  const bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + 22, bounds.y + 22); await page.mouse.down();
  await page.mouse.move(40, 40, { steps: 8 }); await page.mouse.up();
  await expect(frame).toHaveAttribute("data-corner", "top-left");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).webcamCorner)).toBe("top-left");
  await page.reload(); await expect(page.getByTestId("local-camera-video")).toBeVisible();
  await expect(frame).toHaveAttribute("data-corner", "top-left");
  expect(new URL(page.url()).pathname).toBe(path);
  await handle.focus(); await page.keyboard.press("ArrowRight");
  await expect(frame).toHaveAttribute("data-corner", "top-right");
  await page.keyboard.press("ArrowDown"); await expect(frame).toHaveAttribute("data-corner", "bottom-right");
});

test("denial gives a dismissible note and leaves the session working", async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); }; });
  await signIn(page); const path = await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByTestId("camera-permission-note")).toContainText("Enable camera access in your browser settings.");
  await page.getByRole("button", { name: "Dismiss camera note", exact: true }).click();
  await expect(page.getByTestId("camera-permission-note")).toHaveCount(0);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page).toHaveURL(`${path}/complete`, { timeout: 15000 });
});

test("missing camera silently disables its preference without blocking the timer", async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("No device", "NotFoundError"); }; });
  await signIn(page); await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile")!).webcamEnabled)).toBe(false);
  await expect(page.getByTestId("camera-permission-note")).toHaveCount(0);
  await expect(page.getByTestId("session-time")).toBeVisible();
});

test("other camera errors warn without interrupting the session", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", message => { if (message.type() === "warning") warnings.push(message.text()); });
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Device busy", "NotReadableError"); }; });
  await signIn(page); await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect.poll(() => warnings.some(message => message.includes("Local camera unavailable") && message.includes("NotReadableError"))).toBe(true);
  await expect(page.getByTestId("camera-permission-note")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toBeEnabled();
  await expect(page.getByTestId("session-time")).toBeVisible();
});

test("camera controls and permission guidance are translated into all five languages", async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); }; });
  await signIn(page); const path = await startSession(page);
  for (const locale of ["en", "de", "fr", "pl", "it"]) {
    const { webcam } = JSON.parse(readFileSync(new URL(`../src/translations/webcam/${locale}.json`, import.meta.url), "utf8")) as { webcam: Record<string, string> };
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto(path);
    const enable = page.getByRole("button", { name: webcam.enable, exact: true });
    await expect(enable).toBeVisible(); await enable.click();
    await expect(page.getByTestId("camera-permission-note")).toContainText(webcam.permissionNote);
    await expect(page.getByRole("button", { name: webcam.move, exact: true })).toBeVisible();
    await page.getByRole("button", { name: webcam.dismiss, exact: true }).click();
    await expect(page.getByTestId("camera-permission-note")).toHaveCount(0);
  }
});

test("Finish releases live tracks and a late permission response is stopped after unmount", async ({ page }) => {
  await instrument(page); await signIn(page); const path = await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByTestId("local-camera-video")).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page).toHaveURL(`${path}/complete`, { timeout: 15000 });
  expect((await audit(page)).tracks.every(track => track.readyState === "ended")).toBe(true);
  await page.getByRole("link", { name: "Start another", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/study");
  await page.evaluate(() => {
    const getUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = constraints => new Promise(resolve => {
      Object.assign(window, { releaseCamera: async () => resolve(await getUserMedia.call(navigator.mediaDevices, constraints)) });
    });
  });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByTestId("session-screen")).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { releaseCamera?: () => void }).releaseCamera)).toBe("function");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByTestId("complete-screen")).toBeVisible();
  await page.evaluate(async () => { await (window as unknown as { releaseCamera: () => Promise<void> }).releaseCamera(); });
  await expect.poll(async () => (await audit(page)).tracks.every(track => track.readyState === "ended")).toBe(true);
  expect((await audit(page)).violations).toEqual([]);
});

test("phone tap expands within the viewport and both corners keep clear of Finish", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await instrument(page); await signIn(page); await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  const toggle = page.getByRole("button", { name: "Expand self-view", exact: true });
  await expect(toggle).toBeVisible();
  await toggle.tap({ position: { x: 60, y: 55 } });
  await expect(page.getByTestId("self-view")).toHaveAttribute("data-expanded", "true");
  const preview = (await page.getByRole("button", { name: "Collapse self-view", exact: true }).boundingBox())!;
  const finish = (await page.getByRole("button", { name: "Finish", exact: true }).boundingBox())!;
  expect(preview.x).toBeGreaterThanOrEqual(0); expect(preview.x + preview.width).toBeLessThanOrEqual(320);
  expect(preview.y + preview.height).toBeLessThan(finish.y);
  await page.getByRole("button", { name: "Move self-view", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("self-view")).toHaveAttribute("data-corner", "bottom-left");
  await page.screenshot({ path: "test-results/self-view-mobile.png" });
});

test("disabling the camera releases previews in other session tabs too", async ({ page, context }) => {
  await instrument(page); await signIn(page); const path = await startSession(page);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByTestId("local-camera-video")).toBeVisible();
  const other = await context.newPage();
  try {
    await instrument(other); await other.goto(path);
    await expect(other.getByTestId("local-camera-video")).toBeVisible();
    expect((await audit(other)).tracks.some(track => track.readyState === "live")).toBe(true);
    await page.mouse.move(20, 20);
    await page.getByRole("button", { name: "Turn camera off", exact: true }).click();
    await expect(other.getByTestId("local-camera-video")).toHaveCount(0);
    expect((await audit(page)).tracks.every(track => track.readyState === "ended")).toBe(true);
    expect((await audit(other)).tracks.every(track => track.readyState === "ended")).toBe(true);
    expect((await audit(other)).violations).toEqual([]);
  } finally { await other.close(); }
});
