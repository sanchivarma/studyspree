import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const source = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const environment = {};
for (const line of source.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) environment[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
}
const url = environment.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname) || new URL(url).port !== "55321") throw new Error("Account setup requires local StudySpree Supabase.");
const password = environment.DEV_ADMIN_PASSWORD;
const administrator = environment.DEV_ADMIN_USERNAME;
if (!password || administrator !== "ss_admin" || !environment.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Existing local development account configuration is required.");
const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) } };
const admin = createClient(url, environment.SUPABASE_SERVICE_ROLE_KEY, options);
const verification = createClient(url, key, options);
const existing = await verification.auth.signInWithPassword({ email: `${administrator}@local.studyspree.test`, password });
if (existing.error || !existing.data.user) throw new Error("The configured password does not match ss_admin; no accounts were changed.");
const ids = new Set([existing.data.user.id]);
console.log("ss_admin: existing password verified; account preserved.");
for (const username of ["ss_test_1", "ss_test_2"]) {
  const email = `${username}@local.studyspree.test`;
  const client = createClient(url, key, options);
  let signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
    if (created.error) throw new Error(`Unable to prepare ${username}; no passwords or tokens were logged.`);
    signedIn = await client.auth.signInWithPassword({ email, password });
  }
  if (signedIn.error || !signedIn.data.user) throw new Error(`Unable to verify ${username}.`);
  const profile = await client.from("profiles").select("username,onboarding_complete").eq("id", signedIn.data.user.id).single();
  if (profile.error || profile.data.username !== username) throw new Error(`Username mapping for ${username} is unavailable.`);
  if (!profile.data.onboarding_complete) {
    const updated = await client.from("profiles").update({ display_name: username, timezone: "Europe/Berlin", onboarding_complete: true }).eq("id", signedIn.data.user.id);
    if (updated.error) throw new Error(`Onboarding for ${username} is unavailable.`);
  }
  ids.add(signedIn.data.user.id);
  console.log(`${username}: ready, using ss_admin's existing password.`);
}
if (ids.size !== 3) throw new Error("The three accounts must have distinct user IDs.");
console.log("Three distinct local accounts verified. No credentials or sessions were printed.");
