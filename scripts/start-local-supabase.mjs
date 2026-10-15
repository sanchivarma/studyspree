// Capture CLI output: local credentials must never be written into tool logs.
import { spawn } from "node:child_process";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dockerBin = process.platform === "win32" ? "C:\\Program Files\\Docker\\Docker\\resources\\bin" : "";
const child = spawn(process.execPath, [join(root, "node_modules/supabase/dist/supabase.js"), "start", "--exclude", "logflare,vector,edge-runtime,supavisor"], {
  cwd: root, env: { ...process.env, PATH: [dockerBin, process.env.PATH].filter(Boolean).join(delimiter) },
  stdio: ["ignore", "pipe", "pipe"],
});
let errors = "";
child.stdout.on("data", () => {});
child.stderr.on("data", data => { errors = (errors + data.toString()).slice(-16000); });
const progress = setInterval(() => console.log("Local Supabase is starting (container downloads may take several minutes)."), 20000);
child.on("error", () => { clearInterval(progress); console.error("Could not launch the installed Supabase CLI."); process.exitCode = 1; });
child.on("close", code => {
  clearInterval(progress);
  if (code !== 0) {
    const safe = errors.split(/\r?\n/).filter(line => !/key|secret|token|password|postgres(?:ql)?:\/\/|eyJ|sb_/i.test(line)).slice(-25).join("\n");
    console.error(safe);
  }
  console.log(`Local Supabase start exited with status ${code}. Credentials were suppressed.`);
  process.exitCode = code ?? 1;
});
