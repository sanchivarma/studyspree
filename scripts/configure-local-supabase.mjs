// Configure a local stack without displaying or committing its credentials.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync, constants } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { resolve, delimiter } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dockerBin = process.platform === "win32" ? "C:\\Program Files\\Docker\\Docker\\resources\\bin" : "";
const environment = { ...process.env, PATH: [dockerBin, process.env.PATH].filter(Boolean).join(delimiter) };
const status = spawnSync(process.execPath, [resolve(root, "node_modules/supabase/dist/supabase.js"), "status", "-o", "env"], { cwd: root, env: environment, encoding: "utf8" });
if (status.error || status.status !== 0) throw new Error("Start local Supabase before configuring the application.");
const parse = text => new Map(text.split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
  if (!match) return [];
  const value = match[2].trim();
  return [[match[1], value.startsWith('"') ? JSON.parse(value) : value.replace(/^'|'$/g, "")]];
}));
const local = parse(status.stdout);
const url = local.get("API_URL");
const key = local.get("PUBLISHABLE_KEY") || local.get("ANON_KEY");
if (!url || !key || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("Expected a local Supabase API and public key.");
const target = resolve(root, ".env.local");
const source = existsSync(target) ? readFileSync(target, "utf8") : "";
const current = parse(source);
const lookupSecret = current.get("SUPABASE_USERNAME_LOOKUP_SECRET") || randomBytes(32).toString("base64url");
if (lookupSecret.length < 32) throw new Error("The existing lookup secret must contain at least 32 characters.");
const secretHash = createHash("sha256").update(lookupSecret).digest("hex");
const docker = process.platform === "win32" ? resolve(dockerBin, "docker.exe") : "docker";
const configured = spawnSync(docker, ["exec", "-i", "supabase_db_studyspree", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
  cwd: root, env: environment, encoding: "utf8",
  input: `insert into auth_private.login_config(singleton,secret_hash) values (true,'${secretHash}') on conflict(singleton) do update set secret_hash=excluded.secret_hash;\n`,
});
if (configured.error || configured.status !== 0) throw new Error("Could not configure the local username lookup. Existing .env.local retained.");
if (source) {
  try { copyFileSync(target, resolve(root, ".env.local.before-local"), constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
const updates = new Map([
  ["NEXT_PUBLIC_SUPABASE_URL", url], ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key],
  ["NEXT_PUBLIC_USE_LOCAL_REPO", "true"], ["SITE_URL", "http://localhost:3000"],
  ["SUPABASE_USERNAME_LOOKUP_SECRET", lookupSecret],
]);
const serverKey = local.get("SERVICE_ROLE_KEY") || local.get("SECRET_KEY");
if (serverKey) updates.set("SUPABASE_SERVICE_ROLE_KEY", serverKey);
const lines = source.split(/\r?\n/).map(line => {
  const name = line.match(/^([A-Z_][A-Z_0-9]*)=/)?.[1];
  if (!name || !updates.has(name)) return line;
  const value = updates.get(name); updates.delete(name);
  return `${name}=${JSON.stringify(value)}`;
});
for (const [name, value] of updates) lines.push(`${name}=${JSON.stringify(value)}`);
writeFileSync(target, lines.join("\n").trim() + "\n");
console.log("Configured .env.local for local Supabase. Previous values retained in an ignored backup; development login and local study history preserved. No credentials were printed.");
