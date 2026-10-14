import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const names = ["rain.webm", "city-night.webm", "evening-outdoor.webm", "keyboard-room.webm"];
const directory = resolve("public/audio");
if (names.some(name => existsSync(resolve(directory, name)))) throw new Error("Audio assets are immutable. Generate a new version under new filenames.");
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent('<button id="generate">Generate original silence</button>');
  await page.evaluate(() => {
    document.querySelector("button").addEventListener("click", async () => {
      // Synthetic zero signal. No camera, microphone, or third-party recording.
      const context = new AudioContext({ sampleRate: 48000 });
      await context.resume();
      const source = context.createConstantSource(); source.offset.value = 0;
      const destination = context.createMediaStreamDestination(); source.connect(destination); source.start();
      const recorder = new MediaRecorder(destination.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 16000 });
      const chunks = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      recorder.onstop = async () => {
        const bytes = new Uint8Array(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
        window.silentBytes = Array.from(bytes);
        source.stop(); destination.stream.getTracks().forEach(track => track.stop()); await context.close();
      };
      recorder.start(); setTimeout(() => recorder.stop(), 6000);
    });
  });
  await page.click("#generate");
  await page.waitForFunction(() => Array.isArray(window.silentBytes));
  const bytes = Buffer.from(await page.evaluate(() => window.silentBytes));
  for (const name of names) writeFileSync(resolve(directory, name), bytes);
  console.log(`Generated four original six-second silent WebM placeholders (${bytes.length} bytes each).`);
} finally { await browser.close(); }
