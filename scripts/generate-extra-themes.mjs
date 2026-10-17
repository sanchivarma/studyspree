import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Original procedural artwork, matching the existing illustrated theme pipeline.
// Canvas recording is a build tool; it never accesses a camera or microphone.
const slugs = ["nature-day", "nature-night", "sci-fi", "space"];
for (const slug of slugs) for (const name of ["scene-v1.webm", "scene-v1.mp4", "poster-v1.jpg"])
  if (existsSync(resolve("public/themes", slug, name))) throw new Error(`${slug}/${name}: immutable asset already exists`);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const slug of slugs) {
    const result = await page.evaluate(async slug => {
      const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
      const c = canvas.getContext("2d");
      const ellipse = (x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
      const paint = phase => {
        const angle = phase * Math.PI * 2, night = slug === "nature-night";
        const gradient = c.createLinearGradient(0, 0, 0, 720);
        gradient.addColorStop(0, slug === "nature-day" ? "#89bfc4" : night ? "#08152f" : slug === "sci-fi" ? "#061c2b" : "#100b29");
        gradient.addColorStop(1, slug === "nature-day" ? "#f2d7a0" : night ? "#243a51" : slug === "sci-fi" ? "#163d4d" : "#332247");
        c.fillStyle = gradient; c.fillRect(0, 0, 1280, 720);
        if (slug.startsWith("nature")) {
          ellipse(910, 145, night ? 38 : 60, night ? 38 : 60, night ? "#d9e3da" : "#f7e3a6");
          if (night) for (let n = 0; n < 100; n++) ellipse((n * 137) % 1280, (n * 67) % 320, 1, 1, `rgba(220,236,255,${0.2 + 0.2 * Math.sin(angle + n)})`);
          for (let layer = 0; layer < 3; layer++) {
            c.fillStyle = (night ? ["#233c52", "#173644", "#102c33"] : ["#789e91", "#538571", "#2f6657"])[layer];
            c.beginPath(); c.moveTo(0, 720); c.lineTo(0, 380 + layer * 70);
            for (let x = 0; x <= 1280; x += 20) c.lineTo(x, 360 + layer * 80 + Math.sin(x / (170 - layer * 20) + layer) * 80);
            c.lineTo(1280, 720); c.fill();
          }
          c.fillStyle = night ? "#365b70" : "#9bbdb2";
          c.beginPath(); c.moveTo(745, 430); c.bezierCurveTo(570, 490, 870, 530, 400, 720); c.lineTo(1040, 720); c.bezierCurveTo(950, 580, 700, 500, 780, 430); c.fill();
          for (let n = 0; n < 22; n++) {
            const x = n < 11 ? n * 42 : 980 + (n - 11) * 34, y = 370 + n % 4 * 24, h = 170 + n % 5 * 22;
            const sway = Math.sin(angle + n * 0.3) * 2;
            c.fillStyle = night ? "#0a252d" : "#285443"; c.fillRect(x - 5, y, 9, h + 100);
            for (let b = 0; b < 3; b++) { c.beginPath(); c.moveTo(x + sway, y - h * 0.5 + b * 37); c.lineTo(x - 55 + b * 5, y + 75 + b * 37); c.lineTo(x + 55 - b * 5, y + 75 + b * 37); c.fill(); }
          }
          for (let n = 0; n < 28; n++) ellipse(60 + n * 43, 570 + Math.sin(n * 7) * 100 + Math.sin(angle + n) * 7, night ? 2 : 3, night ? 2 : 3, night ? `rgba(186,225,157,${0.3 + 0.25 * Math.sin(angle + n)})` : "#c7bd86");
          for (let n = 0; n < 14; n++) { c.strokeStyle = night ? "#8eb9c033" : "#e7eee24d"; c.beginPath(); c.moveTo(630 + Math.sin(n) * 120, 480 + n * 17); c.lineTo(680 + Math.sin(n) * 120 + Math.sin(angle + n) * 12, 480 + n * 17); c.stroke(); }
        } else {
          for (let n = 0; n < 150; n++) ellipse((n * 173) % 1280, (n * 97) % 720, n % 9 === 0 ? 2 : 1, n % 9 === 0 ? 2 : 1, `rgba(210,229,249,${0.25 + 0.2 * Math.sin(angle + n)})`);
          if (slug === "space") {
            for (let n = 0; n < 6; n++) ellipse(200 + n * 170, 280 + Math.sin(n) * 100, 180, 160, `rgba(113,77,159,${0.025 + 0.008 * Math.sin(angle + n)})`);
            const planet = c.createRadialGradient(820, 210, 15, 900, 290, 205); planet.addColorStop(0, "#bb999c"); planet.addColorStop(0.5, "#8b6e92"); planet.addColorStop(1, "#332940"); ellipse(900, 290, 205, 205, planet);
            c.save(); c.translate(900, 290); c.rotate(-0.3); c.strokeStyle = "#ba9a9955"; c.lineWidth = 14; c.beginPath(); c.ellipse(0, 0, 330, 75, 0, 0, Math.PI * 2); c.stroke(); c.restore();
            c.fillStyle = "#141e32"; c.beginPath(); c.moveTo(0, 650); c.lineTo(1280, 580); c.lineTo(1280, 720); c.lineTo(0, 720); c.fill();
            c.strokeStyle = "#7195ab"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 650); c.lineTo(1280, 580); c.stroke();
          } else {
            ellipse(780, 300, 165, 165, "#397685"); ellipse(743, 268, 110, 80, "#598b91");
            c.strokeStyle = "#365163"; c.lineWidth = 38; c.strokeRect(90, 55, 1100, 490);
            for (const x of [100, 640, 1180]) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x, 550); c.stroke(); }
            c.fillStyle = "#0a1b29"; c.fillRect(0, 565, 1280, 155);
            c.strokeStyle = "#68d3cf"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 565); c.lineTo(1280, 565); c.stroke();
            for (let n = 0; n < 6; n++) { c.fillStyle = "#163f50"; c.fillRect(130 + n * 170, 605, 140, 70); c.fillStyle = `rgba(115,217,217,${0.35 + 0.1 * Math.sin(angle + n)})`; c.fillRect(144 + n * 170, 619, 112, 3); c.fillRect(144 + n * 170, 636, 76, 3); }
          }
        }
      };
      paint(0); const poster = canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
      const stream = canvas.captureStream(24);
      const record = type => {
        if (!MediaRecorder.isTypeSupported(type)) throw new Error(`Encoder unavailable: ${type}`);
        const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1100000 });
        const chunks = [];
        const done = new Promise(resolve => { recorder.ondataavailable = event => chunks.push(event.data); recorder.onstop = async () => resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))); });
        recorder.start(); return { recorder, done };
      };
      const webm = record("video/webm;codecs=vp9"), mp4 = record("video/mp4;codecs=avc1.42001E");
      const start = performance.now(); let frame;
      const animate = () => { paint(((performance.now() - start) / 8000) % 1); frame = requestAnimationFrame(animate); }; animate();
      await new Promise(resolve => setTimeout(resolve, 8000)); cancelAnimationFrame(frame);
      webm.recorder.stop(); mp4.recorder.stop();
      const result = { webm: await webm.done, mp4: await mp4.done, poster };
      stream.getTracks().forEach(track => track.stop()); return result;
    }, slug);
    const directory = resolve("public/themes", slug); mkdirSync(directory, { recursive: true });
    for (const [name, bytes] of [["scene-v1.webm", Buffer.from(result.webm)], ["scene-v1.mp4", Buffer.from(result.mp4)], ["poster-v1.jpg", Buffer.from(result.poster, "base64")]]) {
      if (bytes.length > 8000000) throw new Error(`${slug}/${name}: exceeds 8 MB`);
      writeFileSync(resolve(directory, name), bytes, { flag: "wx" }); console.log(`${slug}/${name}: ${bytes.length} bytes`);
    }
  }
} finally { await browser.close(); }
