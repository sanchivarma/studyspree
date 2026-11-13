// Capture CLI output: local credentials must never be written into tool logs.
import { spawn } from "node:child_process";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
try { process.loadEnvFile(join(root, ".env.local")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const environment = { ...process.env };
const transport = environment.AUTH_EMAIL_TRANSPORT || "mailpit";
if (!["resend", "smtp", "mailpit"].includes(transport)) throw new Error("Choose resend, smtp or mailpit for AUTH_EMAIL_TRANSPORT.");
if (transport !== "mailpit") {
  const rawFrom = environment.AUTH_EMAIL_FROM || environment.INVITATION_FROM || environment.SMTP_USER || "";
  const from = rawFrom.match(/<([^<>\r\n]+)>$/)?.[1] || rawFrom;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) throw new Error("Set a valid AUTH_EMAIL_FROM sender.");
  const host = transport === "resend" ? "smtp.resend.com" : environment.SMTP_HOST;
  const user = transport === "resend" ? "resend" : environment.SMTP_USER;
  const pass = transport === "resend" ? environment.RESEND_API_KEY : environment.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("Authentication SMTP credentials are missing.");
  Object.assign(environment, {
    SUPABASE_LOCAL_SMTP_ENABLED: "false",
    SUPABASE_AUTH_EMAIL_SMTP_ENABLED: "true", SUPABASE_AUTH_EMAIL_SMTP_HOST: host,
    SUPABASE_AUTH_EMAIL_SMTP_PORT: transport === "resend" ? "465" : environment.SMTP_PORT || "465",
    SUPABASE_AUTH_EMAIL_SMTP_USER: user, SUPABASE_AUTH_EMAIL_SMTP_PASS: pass,
    SUPABASE_AUTH_EMAIL_SMTP_ADMIN_EMAIL: from, SUPABASE_AUTH_EMAIL_SMTP_SENDER_NAME: "StudySpree",
  });
}
const dockerBin = process.platform === "win32" ? "C:\\Program Files\\Docker\\Docker\\resources\\bin" : "";
const child = spawn(process.execPath, [join(root, "node_modules/supabase/dist/supabase.js"), "start", "--exclude", "logflare,vector,edge-runtime,supavisor"], {
  cwd: root, env: { ...environment, PATH: [dockerBin, process.env.PATH].filter(Boolean).join(delimiter) },
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
  if (code === 0) console.log(`Authentication email transport: ${transport}.`);
  process.exitCode = code ?? 1;
});
