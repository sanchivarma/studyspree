import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { chromium } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

// A local, authenticated browser benchmark. Credentials and cookies are never
// logged or written to the report. Use the same mode/host for before/after runs.
const environment = { ...process.env };
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !environment[match[1]]) environment[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
}
const base = new URL(environment.PERF_BASE_URL ?? "http://localhost:3000").origin;
const local = value => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);
if (!local(base) || !environment.NEXT_PUBLIC_SUPABASE_URL || !local(environment.NEXT_PUBLIC_SUPABASE_URL)) {
  throw new Error("Navigation measurement requires the local app and local Supabase.");
}
const cookies = [];
const client = createServerClient(environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [], setAll: values => cookies.push(...values) },
  });
const login = await client.auth.signInWithPassword({
  email: `${environment.DEV_ADMIN_USERNAME}@local.studyspree.test`, password: environment.DEV_ADMIN_PASSWORD,
});
if (login.error) throw new Error("The connected local development account could not sign in.");
const active = await client.from("sessions").select("id").eq("user_id", login.data.user.id).is("ended_at", null).maybeSingle();
if (active.error || active.data) throw new Error("Run the navigation benchmark when this local account has no active study session.");

const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: "reduce" });
await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: base })));
const page = await context.newPage();
page.setDefaultTimeout(120_000);
const requests = [], errors = [], samples = [];
const elapsed = start => Math.round(performance.now() - start);
function operation(request) {
  try {
    const body = request.postDataJSON();
    return body.op ?? body.command?.action ?? body.area;
  } catch { return undefined; }
}
page.on("pageerror", error => errors.push(error.message));
page.on("requestfinished", request => {
  const url = new URL(request.url());
  if (url.origin !== base) return;
  requests.push({ path: url.pathname, type: request.resourceType(), operation: operation(request), ms: Math.round(request.timing().responseEnd) });
});
const scriptResources = () => page.evaluate(() => performance.getEntriesByType("resource")
  .filter(resource => resource.initiatorType === "script")
  .map(resource => ({ path: new URL(resource.name).pathname, decodedBytes: resource.decodedBodySize, transferBytes: resource.transferSize })));
let originalPreferences;
try {
  let start = performance.now();
  await page.goto(base);
  await page.getByTestId("default-study-room").waitFor();
  samples.push({ action: "initial Home", readyMs: elapsed(start) });
  const initialScripts = await scriptResources();
  const profile = await page.request.post(`${base}/api/repository`, { data: { op: "profile" } });
  if (!profile.ok()) throw new Error("The benchmark requires a connected account.");
  originalPreferences = (await profile.json()).companionPreferences;

  const destinations = [
    ["Study", "/study", 'section[aria-label="Start a study session"]'],
    ["Settings", "/settings", 'input[autocomplete="nickname"]'],
    ["Stats", "/stats", '[data-testid="stats-total"]'],
    ["Calendar", "/calendar", '[data-testid^="calendar-day-"]'],
    ["Contacts", "/contacts", '[data-testid="contacts-screen"]'],
    ["Start", "/", '[data-testid="default-study-room"]'],
  ];
  const cycles = Number(environment.PERF_CYCLES ?? 3);
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 10) throw new Error("PERF_CYCLES must be between 1 and 10.");
  const nav = () => page.getByRole("navigation", { name: "Main navigation", exact: true });
  for (let cycle = 0; cycle < cycles; cycle++) for (const [action, path, selector] of destinations) {
    const offset = requests.length;
    start = performance.now();
    await nav().getByRole("link", { name: action, exact: true }).click();
    await page.waitForURL(new URL(path, base).href);
    const navigationMs = elapsed(start);
    await page.locator("main").locator(selector).first().waitFor();
    samples.push({ cycle, action, navigationMs, readyMs: elapsed(start), requests: requests.slice(offset) });
  }

  await nav().getByRole("link", { name: "Study", exact: true }).click();
  await page.waitForURL(`${base}/study`);
  start = performance.now();
  await page.getByRole("button", { name: "Choose companions", exact: true }).click();
  await page.getByRole("button", { name: "Virtual partners", exact: true }).click();
  await page.getByTestId("character-card-male-01").waitFor();
  samples.push({ action: "open Virtual Partners", readyMs: elapsed(start) });
  const preferenceResponse = () => page.waitForResponse(response => {
    if (new URL(response.url()).pathname !== "/api/repository" || operation(response.request()) !== "updateProfile") return false;
    return Boolean(response.request().postDataJSON().patch?.companionPreferences);
  });
  let saved = preferenceResponse();
  start = performance.now();
  await page.getByTestId("character-card-male-01").click();
  await page.getByTestId("character-card-male-01").evaluate(element => {
    if (element.getAttribute("aria-pressed") !== "true") throw new Error("Partner selection did not update.");
  });
  const selectionMs = elapsed(start);
  if (!(await saved).ok()) throw new Error("Partner preferences could not be saved.");
  samples.push({ action: "select partner", readyMs: selectionMs, savedMs: elapsed(start) });
  saved = preferenceResponse();
  await page.getByTestId("character-card-male-01").click();
  if (!(await saved).ok()) throw new Error("Partner preferences could not be restored.");
  await page.getByRole("button", { name: "Close", exact: true }).click();

  const scripts = await scriptResources();
  const report = { label: environment.PERF_LABEL ?? "navigation", timestamp: new Date().toISOString(), base, samples, requests, errors, initialScripts, scripts };
  mkdirSync(new URL("../.tmp/", import.meta.url), { recursive: true });
  writeFileSync(environment.PERF_OUTPUT ?? new URL("../.tmp/performance-navigation.json", import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ samples: samples.map(({ requests, ...sample }) => ({ ...sample, requestCount: requests?.length })),
    initialScriptBytes: initialScripts.reduce((sum, script) => sum + script.decodedBytes, 0),
    journeyScriptBytes: scripts.reduce((sum, script) => sum + script.decodedBytes, 0), errors }, null, 2));
} finally {
  if (originalPreferences) {
    const restored = await page.request.post(`${base}/api/repository`, { data: { op: "updateProfile", patch: { companionPreferences: originalPreferences } } });
    if (!restored.ok()) console.error("The benchmark could not restore the original companion preferences.");
  }
  await browser.close();
}
