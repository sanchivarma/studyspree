import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Original vector scenes and synthesized audio. No downloads, recordings,
// microphone, camera, third-party artwork, or third-party music are involved.
const slugs = ["rain-desk", "night-shift", "balcony-dusk", "dorm-bunk"];
const audioNames = ["rain-v1", "city-night-v1", "evening-outdoor-v1", "keyboard-room-v1", "still-water-v1"];
const paths = [...slugs.flatMap(slug => ["scene-v1.webm", "scene-v1.mp4", "poster-v1.jpg"].map(name => `public/themes/${slug}/${name}`)), ...audioNames.map(name => `public/audio/${name}.webm`)];
if (paths.some(path => existsSync(resolve(path)))) throw new Error("Media is immutable. Choose new versioned filenames before generating another edition.");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent('<button>Generate original StudySpree media</button>');
  for (const [index, slug] of slugs.entries()) {
    const result = await page.evaluate(async index => {
      const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext("2d");
      const colors = [["#0a1527", "#284760", "#dba164"], ["#060d1c", "#122f4b", "#82b7d1"], ["#b77868", "#46334e", "#efbf7b"], ["#080f1d", "#142f48", "#83bfdc"]][index];
      const buildings = Array.from({ length: 12 }, (_, n) => {
        const x = 350 + n * 56, y = 310 - (n * 47 % 125);
        return `<path d="M${x} 470V${y}h48V470" fill="${index === 2 ? "#4c3b50" : "#101e30"}"/>` + Array.from({ length: 6 }, (_, j) => `<rect x="${x + 9 + j % 2 * 19}" y="${y + 18 + Math.floor(j / 2) * 27}" width="8" height="11" fill="${j % 3 ? "#c79865" : "#557e9a"}" opacity=".55"/>`).join("");
      }).join("");
      const books = Array.from({ length: 8 }, (_, n) => `<rect x="${92 + n * 26}" y="${210 + n % 3 * 9}" width="21" height="${104 - n % 3 * 9}" rx="2" fill="${["#496574", "#a67e68", "#7a7980", "#9e977c"][n % 4]}"/><path d="M${100 + n * 26} ${225 + n % 3 * 9}v64" stroke="#d9d0ae" opacity=".4"/>`).join("");
      const windowScene = `<rect x="350" y="68" width="690" height="414" rx="8" fill="url(#sky)"/>${index === 2 ? '<circle cx="495" cy="230" r="54" fill="#e9b68b" opacity=".65"/>' : '<circle cx="870" cy="137" r="24" fill="#b7d1d6" opacity=".55"/>'}${buildings}<path d="M350 482V68h690v414M695 68v414M350 274h690" fill="none" stroke="#263444" stroke-width="16"/>`;
      const desk = '<path d="M0 555L1075 510l205 57v153H0Z" fill="#493e3b"/><path d="M0 555l1075-45 205 57" stroke="#9b7b5b" stroke-width="8"/><path d="M170 635l910-28M95 683l1050-34" stroke="#856b53" opacity=".2"/><path d="M440 540l132-20 119 28-133 30Z" fill="#c2b8a0"/><path d="M572 520l-14 58M455 543l91-12M464 551l80-11M584 534l82 16M581 542l69 14" stroke="#827e73" stroke-width="2"/><path d="M760 507v44c0 30 65 30 65 0v-44Z" fill="#889a99"/><ellipse cx="792" cy="507" rx="33" ry="12" fill="#38494e"/><path d="M826 518c43-3 42 35 0 29" fill="none" stroke="#889a99" stroke-width="9"/>';
      const lamp = `<ellipse cx="230" cy="550" rx="62" ry="12" fill="#343a40"/><path d="M230 541V413l58-88" stroke="#48515b" stroke-width="13" fill="none"/><path d="M251 307l61 5 28 54-119-8Z" fill="${colors[2]}"/><ellipse cx="280" cy="363" rx="57" ry="9" fill="#f4cd87"/><path d="M230 370L125 552h345L335 370Z" fill="url(#light)"/>`;
      const plant = '<path d="M1125 557l-23-79h98l-21 79Z" fill="#a57e68"/><path d="M1151 480v-139" stroke="#6b8d83" stroke-width="7"/><path d="M1150 442q-102-8-66-73 69 5 66 73M1153 417q84-21 68-85-62 13-68 85M1152 375q-61-31-36-75 53 11 36 75" fill="#4b756e"/>';
      const bunk = '<path d="M0 110h320v30H0M34 140v405M305 140v388" stroke="#394f62" stroke-width="17"/><path d="M0 78h315v43H0" fill="#334656"/><path d="M18 66h275v28H18" fill="#73848e"/><path d="M0 140h62v310H0" fill="#23384c"/>';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="wall" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${index === 2 ? "#d8a079" : "#13243d"}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient><radialGradient id="light"><stop stop-color="${colors[2]}" stop-opacity=".27"/><stop offset="1" stop-color="${colors[2]}" stop-opacity="0"/></radialGradient></defs><rect width="1280" height="720" fill="url(#wall)"/>${windowScene}${index === 3 ? bunk : `<path d="M67 321h249" stroke="#4c4a49" stroke-width="13"/>${books}`}<path d="M1059 30v464h-39V30M334 30v464h-32V30" fill="#192b3b" opacity=".8"/>${desk}${index === 3 ? '<rect x="230" y="425" width="133" height="91" rx="6" fill="#75a9c5" opacity=".7"/><path d="M216 526h163" stroke="#9ab5bf" stroke-width="9"/>' : lamp}${plant}</svg>`;
      const image = new Image(); image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`; await image.decode();
      const paint = t => {
        ctx.drawImage(image, 0, 0);
        if (index === 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(360, 78, 670, 394); ctx.clip(); ctx.strokeStyle = "rgba(168,201,221,.28)"; ctx.lineWidth = 1.4;
          for (let n = 0; n < 105; n++) { const x = 360 + n * 103 % 665, y = 78 + ((n * 71 + t * 788) % 394); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); ctx.stroke(); }
          ctx.restore();
        }
        // All movement is periodic over the twelve-second cycle.
        ctx.fillStyle = `rgba(231,186,121,${0.025 + 0.012 * Math.sin(t * Math.PI * 2)})`;
        ctx.beginPath(); ctx.ellipse(260, 520, 220, 84, 0, 0, Math.PI * 2); ctx.fill();
        for (let n = 0; n < 3; n++) {
          const y = 489 - ((t * 44 + n * 14) % 44);
          ctx.strokeStyle = `rgba(222,214,191,${0.1 * Math.sin((489 - y) / 44 * Math.PI)})`;
          ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(787 + n * 7, y); ctx.bezierCurveTo(778 + n * 7, y - 7, 800 + n * 7, y - 13, 790 + n * 7, y - 20); ctx.stroke();
        }
      };
      paint(0); const poster = canvas.toDataURL("image/jpeg", 0.88).split(",")[1];
      const stream = canvas.captureStream(24);
      const record = type => {
        if (!MediaRecorder.isTypeSupported(type)) throw new Error(`Encoder unavailable: ${type}`);
        const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1100000 });
        const chunks = [];
        const done = new Promise(resolve => { recorder.ondataavailable = e => chunks.push(e.data); recorder.onstop = async () => resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))); });
        recorder.start(); return { recorder, done };
      };
      const webm = record("video/webm;codecs=vp9"), mp4 = record("video/mp4;codecs=avc1.42001E");
      const start = performance.now(); let frame;
      const animate = () => { paint(((performance.now() - start) / 12000) % 1); frame = requestAnimationFrame(animate); }; animate();
      await new Promise(resolve => setTimeout(resolve, 12000)); cancelAnimationFrame(frame);
      webm.recorder.stop(); mp4.recorder.stop();
      const result = { webm: await webm.done, mp4: await mp4.done, poster };
      stream.getTracks().forEach(track => track.stop()); return result;
    }, index);
    const directory = resolve(`public/themes/${slug}`); mkdirSync(directory, { recursive: true });
    for (const [name, bytes] of [["scene-v1.webm", Buffer.from(result.webm)], ["scene-v1.mp4", Buffer.from(result.mp4)], ["poster-v1.jpg", Buffer.from(result.poster, "base64")]]) {
      if (bytes.length > 8000000) throw new Error(`${slug}/${name}: over the 8 MB budget`);
      writeFileSync(resolve(directory, name), bytes, { flag: "wx" }); console.log(`${slug}/${name}: ${bytes.length} bytes`);
    }
  }
  // Record only a synthesized AudioBuffer; this never requests microphone access.
  for (const [kind, name] of audioNames.entries()) {
    const bytes = await page.evaluate(async kind => {
      const rate = 48000, seconds = 16, length = rate * seconds;
      const context = new AudioContext({ sampleRate: rate }); await context.resume();
      const buffer = context.createBuffer(2, length, rate);
      let seed = 17017 + kind;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel); let low = 0;
        for (let i = 0; i < length; i++) {
          const t = i / rate, noise = random(); low = low * 0.985 + noise * 0.015;
          const periodic = (hz, phase = 0) => Math.sin(2 * Math.PI * hz * t + phase);
          if (kind === 0) data[i] = noise * 0.13 + low * 0.75;
          if (kind === 1) data[i] = low * 0.8 + periodic(55) * 0.012 * (0.65 + periodic(0.125) * 0.35) + noise * 0.012;
          if (kind === 2) data[i] = low * 0.32 + noise * 0.025 + periodic(2750 + channel * 90) * Math.pow(Math.max(0, periodic(3) * periodic(0.25)), 8) * 0.022;
          if (kind === 3) { const phase = t % 0.37; data[i] = low * 0.15 + (phase < 0.025 ? noise * 0.16 * Math.exp(-phase * 140) : 0); }
          if (kind === 4) data[i] = (periodic(130.8128) + periodic(164.8138, 0.2) + periodic(195.9977, 0.4)) * 0.034 * (0.8 + periodic(0.125) * 0.2);
          data[i] *= Math.min(1, t / 0.08, (seconds - t) / 0.08);
        }
      }
      const source = context.createBufferSource(); source.buffer = buffer;
      const destination = context.createMediaStreamDestination(); source.connect(destination);
      const recorder = new MediaRecorder(destination.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 96000 });
      const chunks = []; const done = new Promise(resolve => { recorder.ondataavailable = e => chunks.push(e.data); recorder.onstop = async () => resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))); });
      recorder.start(); source.start(); source.onended = () => recorder.stop();
      const result = await done; destination.stream.getTracks().forEach(track => track.stop()); await context.close(); return result;
    }, kind);
    mkdirSync(resolve("public/audio"), { recursive: true });
    writeFileSync(resolve(`public/audio/${name}.webm`), Buffer.from(bytes), { flag: "wx" }); console.log(`${name}.webm: ${bytes.length} bytes`);
  }
} finally { await browser.close(); }
