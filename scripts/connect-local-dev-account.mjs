import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = new URL("../.env.local", import.meta.url);
const source = readFileSync(envFile, "utf8");
const environment = { ...process.env };
for (const line of source.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !environment[match[1]]) environment[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
}
const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const username = environment.DEV_ADMIN_USERNAME;
const password = environment.DEV_ADMIN_PASSWORD;
if (!url || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) throw new Error("A running local Supabase database is required.");
if (!username || !/^[a-z0-9_]{3,30}$/.test(username) || !password || password.length < 8) throw new Error("Configure the local development username and a password of at least eight characters.");
const email = `${username}@local.studyspree.test`;
const client = createClient(url, environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }) },
});
let signedIn = await client.auth.signInWithPassword({ email, password });
if (signedIn.error) {
  const signup = await client.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: "http://localhost:3000/auth/callback" } });
  if (signup.error) throw new Error(`Local account signup unavailable (${signup.error.code ?? "auth"}).`);
  if (!signup.data.session) {
    let verified = false;
    for (let attempt = 0; attempt < 15 && !verified; attempt++) {
      const listing = await fetch("http://127.0.0.1:55324/api/v1/messages", { signal: AbortSignal.timeout(10_000) }).then(response => response.json());
      const message = listing.messages?.find(item => item.To?.some(to => to.Address === email));
      if (message) {
        const content = await fetch(`http://127.0.0.1:55324/api/v1/message/${encodeURIComponent(message.ID)}`, { signal: AbortSignal.timeout(10_000) }).then(response => response.json());
        const links = `${content.HTML ?? ""}\n${content.Text ?? ""}`.match(/https?:\/\/[^\s"<>]+/g) ?? [];
        const link = links.map(value => new URL(value.replaceAll("&amp;", "&"))).find(value => value.origin === new URL(url).origin && value.pathname === "/auth/v1/verify");
        if (link?.searchParams.get("token")) {
          const confirmation = await client.auth.verifyOtp({ token_hash: link.searchParams.get("token"), type: "signup" });
          verified = !confirmation.error;
        }
      }
      if (!verified) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!verified) throw new Error("Local email confirmation was not available in Mailpit. No external email was sent.");
  }
  signedIn = await client.auth.signInWithPassword({ email, password });
}
if (signedIn.error || !signedIn.data.user) throw new Error("Local account could not sign in.");
const profile = await client.from("profiles").select("onboarding_complete").eq("id", signedIn.data.user.id).single();
if (profile.error) throw new Error("Local account profile is unavailable.");
if (!profile.data.onboarding_complete) {
  const update = await client.from("profiles").update({ display_name: username, timezone: "Europe/Berlin", onboarding_complete: true }).eq("id", signedIn.data.user.id);
  if (update.error) throw new Error("Local onboarding could not be completed.");
}
const flag = "DEV_ADMIN_USE_SUPABASE=true";
writeFileSync(envFile, /^DEV_ADMIN_USE_SUPABASE=.*$/m.test(source) ? source.replace(/^DEV_ADMIN_USE_SUPABASE=.*$/m, flag) : `${source.trimEnd()}\n${flag}\n`);
console.log("Local development account connected. Existing development credentials now sign into local Supabase. No credentials were printed.");
