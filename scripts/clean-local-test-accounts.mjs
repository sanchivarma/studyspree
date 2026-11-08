import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (process.argv.slice(2).some(value => value !== "--apply")) throw new Error("Use --apply to perform the audited local cleanup; otherwise it is a dry-run.");
const source = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const raw = source.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, "");
if (!raw || !["localhost", "127.0.0.1"].includes(new URL(raw).hostname) || new URL(raw).port !== "55321") throw new Error("Cleanup requires the StudySpree local Supabase instance.");
const result = spawnSync("docker", ["exec", "-i", "supabase_db_studyspree", "psql", "-U", "postgres", "-d", "postgres", "-v", `apply=${process.argv.includes("--apply")}`], {
  input: readFileSync(new URL("./clean-local-test-accounts.sql", import.meta.url), "utf8"), encoding: "utf8", windowsHide: true,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error || result.status !== 0) throw new Error("Local cleanup did not complete; its transaction was rolled back.");
