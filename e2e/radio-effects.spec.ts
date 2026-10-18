import { test, expect, type Page } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";

async function setSlider(page: Page, name: string, value: number) {
  const slider = page.getByRole("slider", { name, exact: true });
  await slider.evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, String(value));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await expect(slider).toHaveValue(String(value));
}

test("medieval, library and castle have independent saved levels", async ({ page }) => {
  await signIn(page); const path = await startSession(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  for (const [name, volume] of [["Medieval lute", 0.25], ["Library ambience", 0.65], ["Castle hearth", 0.4]] as const) {
    await page.getByRole("checkbox", { name, exact: true }).check();
    await setSlider(page, `${name} volume`, volume);
  }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile") ?? "{}").effectVolumes)).toEqual({ medieval: 0.25, library: 0.65, castle: 0.4 });
  await page.reload(); await expect(page.getByTestId("session-screen")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  for (const [name, volume] of [["Medieval lute", 0.25], ["Library ambience", 0.65], ["Castle hearth", 0.4]] as const) {
    await expect(page.getByRole("checkbox", { name, exact: true })).toBeChecked();
    await expect(page.getByRole("slider", { name: `${name} volume`, exact: true })).toHaveValue(String(volume));
  }
});

for (const width of [320, 1280]) test(`radio volume is visible and keyboard adjustable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  // Match the provider's 640px breakpoint without contacting its live stream.
  await page.route("https://loficafe.net/**", route => route.fulfill({ contentType: "text/html", body: `
    <style>body{margin:0}main{height:80px;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 16px}
    label{display:none}input{width:64px}@media(min-width:640px){label{display:block}}</style>
    <main><button>Mute</button><label>Radio volume<input aria-label="Radio volume" type="range" min="0" max="1" step="0.1" value="0.8"></label><button>Play</button></main>` }));
  await signIn(page); await startSession(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.getByRole("radio", { name: /Lofi Cafe.*Studying/ }).check();
  const volume = page.frameLocator('iframe[title="Lofi Cafe · Studying"]').getByRole("slider", { name: "Radio volume" });
  await expect(volume).toBeVisible();
  const player = page.getByTestId("radio-player"); await player.scrollIntoViewIfNeeded();
  const bounds = await player.boundingBox(); const control = await volume.boundingBox();
  expect(bounds).not.toBeNull(); expect(control).not.toBeNull();
  expect(control!.x).toBeGreaterThanOrEqual(bounds!.x);
  expect(control!.x + control!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
  await volume.focus(); await page.keyboard.press("ArrowLeft"); await expect(volume).toHaveValue("0.7");
  await expect(page.getByRole("slider", { name: "Music Volume", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("multiselect effects persist; radio mounts on selection and survives closing the sound control", async ({ page }) => {
  // Test the integration contract without contacting an external provider.
  const frames: string[] = [];
  await page.route("https://loficafe.net/**", async route => {
    frames.push(route.request().url());
    await route.fulfill({ contentType: "text/html", body: '<button aria-label="Play radio">Play</button><input aria-label="Radio volume" type="range">' });
  });
  await signIn(page); const path = await startSession(page);
  const startedAt = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt);
  expect(frames).toEqual([]);
  const sound = page.getByRole("button", { name: "Sound", exact: true });
  await sound.click();
  await page.getByRole("checkbox", { name: "Wind", exact: true }).check();
  await page.getByRole("checkbox", { name: "Rain", exact: true }).check();
  await setSlider(page, "Rain volume", 0.75);
  await setSlider(page, "Wind volume", 0.2);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile") ?? "{}").backgroundEffects)).toEqual(["wind", "rain"]);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile") ?? "{}").effectVolumes)).toEqual({ rain: 0.75, wind: 0.2 });
  await page.getByRole("radio", { name: "Lofi Cafe · Studying", exact: true }).check();
  await expect(page.frameLocator('iframe[title="Lofi Cafe · Studying"]').getByRole("button", { name: "Play radio" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Music Volume", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape"); await expect(page.getByTestId("ambience-popover")).not.toBeVisible();
  await expect(page.locator('iframe[title="Lofi Cafe · Studying"]')).toHaveCount(1);
  await sound.click();
  await page.getByRole("button", { name: "Turn off radio", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload(); await expect(page.getByTestId("session-screen")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path);
  await sound.click(); await expect(page.getByRole("checkbox", { name: "Rain", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Wind", exact: true })).toBeChecked();
  await expect(page.getByRole("slider", { name: "Rain volume", exact: true })).toHaveValue("0.75");
  await expect(page.getByRole("slider", { name: "Wind volume", exact: true })).toHaveValue("0.2");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(startedAt);
});

test("favorite effect levels carry into the next session", async ({ page }) => {
  await signIn(page); const path = await startSession(page);
  const sound = page.getByRole("button", { name: "Sound", exact: true });
  await sound.click();
  await page.getByRole("checkbox", { name: "Wind", exact: true }).check();
  await page.getByRole("checkbox", { name: "Rain", exact: true }).check();
  await setSlider(page, "Rain volume", 0.75); await setSlider(page, "Wind volume", 0.2);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile") ?? "{}").effectVolumes)).toEqual({ rain: 0.75, wind: 0.2 });
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page).toHaveURL(`${path}/complete`, { timeout: 15000 });
  const nextPath = await startSession(page);
  expect(nextPath).not.toBe(path);
  await sound.click();
  await expect(page.getByRole("checkbox", { name: "Rain", exact: true })).toBeChecked();
  await expect(page.getByRole("slider", { name: "Rain volume", exact: true })).toHaveValue("0.75");
  await expect(page.getByRole("slider", { name: "Wind volume", exact: true })).toHaveValue("0.2");
});

test("master effect volume controls the live output and zero silences it", async ({ page }) => {
  await page.addInitScript(() => {
    const gains: GainNode[] = [];
    const sources = new Set<AudioBufferSourceNode>();
    Object.assign(window, { effectGainNodes: gains, activeEffectSources: sources });
    const createBuffer = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = createBuffer.call(this);
      const start = source.start.bind(source); const stop = source.stop.bind(source);
      source.start = (...args: Parameters<typeof source.start>) => { start(...args); sources.add(source); };
      source.stop = (...args: Parameters<typeof source.stop>) => { try { stop(...args); } finally { sources.delete(source); } };
      source.addEventListener("ended", () => sources.delete(source));
      return source;
    };
    const create = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const gain = create.call(this); gains.push(gain);
      const disconnect = gain.disconnect.bind(gain);
      gain.disconnect = () => { const index = gains.indexOf(gain); if (index >= 0) gains.splice(index, 1); disconnect(); };
      return gain;
    };
  });
  await signIn(page); await startSession(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await page.getByRole("checkbox", { name: "Rain", exact: true }).check();
  await setSlider(page, "Rain volume", 0.5);
  await setSlider(page, "Background effects volume", 0.8);
  const values = () => page.evaluate(() => (window as unknown as { effectGainNodes: GainNode[] }).effectGainNodes.map(node => node.gain.value));
  const playing = () => page.evaluate(() => (window as unknown as { activeEffectSources: Set<AudioBufferSourceNode> }).activeEffectSources.size);
  await expect.poll(async () => (await values()).some(value => Math.abs(value - 0.4) < 0.01)).toBe(true);
  await expect.poll(playing).toBeGreaterThan(0);
  await setSlider(page, "Background effects volume", 0.2);
  await expect.poll(async () => (await values()).some(value => Math.abs(value - 0.1) < 0.01)).toBe(true);
  await setSlider(page, "Background effects volume", 0);
  await expect.poll(playing).toBe(0);
  await setSlider(page, "Background effects volume", 0.8);
  await expect.poll(async () => (await values()).some(value => Math.abs(value - 0.4) < 0.01)).toBe(true);
  await expect.poll(playing).toBeGreaterThan(0);
});
