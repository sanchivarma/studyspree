import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signIn, startSession } from "./sessionFixtures";
import { backgroundEffects } from "../src/lib/audio/effects";
const radioStationCount = (JSON.parse(readFileSync(new URL("../src/lib/audio/radio-stations.json", import.meta.url), "utf8")) as unknown[]).length;

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const audit = { contexts: 0, fades: [] as number[], playing: new Set<AudioBufferSourceNode>() };
    Object.assign(window, { audioAudit: audit });
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) { super(options); audit.contexts++; }
      createGain() {
        const node = super.createGain();
        const ramp = node.gain.linearRampToValueAtTime.bind(node.gain);
        node.gain.linearRampToValueAtTime = (value, time) => { audit.fades.push(value); return ramp(value, time); };
        return node;
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source); const stop = source.stop.bind(source);
        source.start = (...args: Parameters<typeof source.start>) => { start(...args); audit.playing.add(source); };
        source.stop = (...args: Parameters<typeof source.stop>) => { stop(...args); audit.playing.delete(source); };
        source.addEventListener("ended", () => audit.playing.delete(source));
        return source;
      }
    };
  });
}
async function slider(page: Page, name: string, value: number) {
  const input = page.getByRole("slider", { name, exact: true });
  await input.evaluate((element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(element, String(value)); element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await expect(input).toHaveValue(String(value));
}
async function preferences(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("ss_profile") ?? "{}"));
}

test("default off, gesture unlock, independent controls, debounced persistence and no autoplay after refresh", async ({ page }) => {
  await instrument(page); await signIn(page); const path = await startSession(page);
  const requests: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/audio/")) requests.push(request.url()); });
  expect(await page.evaluate(() => (window as unknown as { audioAudit: { contexts: number } }).audioAudit.contexts)).toBe(0);
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await expect(page.getByTestId("ambience-popover")).toBeVisible();
  await expect(page.getByRole("slider", { name: "Music Volume", exact: true })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Background effects volume", exact: true })).toHaveValue("0");
  expect(await page.evaluate(() => (window as unknown as { audioAudit: { contexts: number } }).audioAudit.contexts)).toBe(1);
  await page.getByRole("checkbox", { name: "Rain", exact: true }).check(); await slider(page, "Background effects volume", 0.5);
  await expect.poll(() => preferences(page)).toMatchObject({ ambienceEnabled: true, musicTrack: null, roomVolume: 0.5 });
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  expect(requests.every(url => ["/audio/rain.webm", "/audio/effect-rain-v3.mp3"].includes(new URL(url).pathname))).toBe(true);
  await page.keyboard.press("Escape"); await expect(page.getByTestId("ambience-popover")).not.toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path);
  await page.reload(); await expect(page.getByTestId("session-screen")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { audioAudit: { contexts: number } }).audioAudit.contexts)).toBe(0);
  const count = requests.length; await page.waitForTimeout(300); expect(requests).toHaveLength(count);
  await page.getByRole("button", { name: "Sound", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Music Volume", exact: true })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Background effects volume", exact: true })).toHaveValue("0.5");
});

test("effects stay independent of theme, visibility fades and Finish releases gains without changing session data", async ({ page }) => {
  await instrument(page); await signIn(page); const path = await startSession(page);
  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt);
  const requests: string[] = []; page.on("request", request => { if (request.url().includes("/audio/")) requests.push(request.url()); });
  await page.getByRole("button", { name: "Sound", exact: true }).click(); await page.getByRole("checkbox", { name: "Rain", exact: true }).check(); await slider(page, "Background effects volume", 0.5);
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioAudit: { fades: number[] } }).audioAudit.fades.includes(0.5))).toBe(true);
  await page.keyboard.press("Escape");
  const priorFades = await page.evaluate(() => (window as unknown as { audioAudit: { fades: number[] } }).audioAudit.fades.filter(value => value === 0.5).length);
  await page.getByRole("button", { name: "Switch theme", exact: true }).click();
  await page.getByRole("button", { name: /Night Shift/ }).click();
  expect(requests.some(url => url.includes("city-night-v1.webm"))).toBe(false);
  expect(await page.evaluate(() => (window as unknown as { audioAudit: { fades: number[] } }).audioAudit.fades.filter(value => value === 0.5).length)).toBeGreaterThanOrEqual(priorFades);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ss_sessions")!)[0].startedAt)).toBe(initial);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioAudit: { fades: number[] } }).audioAudit.fades.includes(0))).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.mouse.move(20, 20);
  await page.getByRole("button", { name: "Finish", exact: true }).click(); await expect(page).toHaveURL(`${path}/complete`, { timeout: 15000 });
  await expect(page.getByTestId("complete-screen")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioAudit: { playing: Set<AudioBufferSourceNode> } }).audioAudit.playing.size)).toBe(0);
});

test("a missing room file leaves Finish usable without application errors", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  let requested = false;
  await page.route("**/audio/effect-rain-v3.mp3", route => { requested = true; return route.fulfill({ status: 404, body: "" }); });
  await signIn(page); const path = await startSession(page);
  await page.getByRole("button", { name: "Sound", exact: true }).click(); await page.getByRole("checkbox", { name: "Rain", exact: true }).check(); await slider(page, "Background effects volume", 0.5);
  await expect.poll(() => requested).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Finish", exact: true }).click(); await expect(page).toHaveURL(`${path}/complete`, { timeout: 15000 });
  expect(errors).toEqual([]);
});

for (const locale of ["en", "de", "fr", "pl", "it"]) test(`popover fits a phone, respects focus, and translates every control: ${locale}`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await signIn(page); const path = await startSession(page);
    const { ambience } = JSON.parse(readFileSync(new URL(`../src/translations/ambience/${locale}.json`, import.meta.url), "utf8")) as { ambience: Record<string, string> };
    const { session } = JSON.parse(readFileSync(new URL(`../src/translations/session/${locale}.json`, import.meta.url), "utf8")) as { session: { sound: string } };
    await page.context().addCookies([{ name: "ss_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto(path); const trigger = page.getByRole("button", { name: session.sound, exact: true }); await trigger.click();
    await expect(page.getByRole("slider")).toHaveCount(backgroundEffects.length + 1);
    await expect(page.getByRole("slider", { name: ambience.room, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: ambience.radioOff, exact: true })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(radioStationCount);
    await expect(page.getByText(ambience.tracks, { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (locale === "en") await page.screenshot({ path: "test-results/ambience-mobile.png" });
    await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); expect(new URL(page.url()).pathname).toBe(path);
});
