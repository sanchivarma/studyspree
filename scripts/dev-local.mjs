import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

// One foreground command owns both processes; stopping it stops its children.
// Never search for or terminate another developer's server.
const root = fileURLToPath(new URL("../", import.meta.url));
const children = [];
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
function run(script, args = [], env = process.env) {
  const child = spawn(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...args], { cwd: root, stdio: "inherit", env, windowsHide: true });
  children.push(child);
  child.on("error", () => { console.error("Local development process could not start."); close(1); });
  child.on("exit", code => close(code ?? 1));
}
const production = process.argv.includes("--production");
run("../node_modules/next/dist/bin/next", production
  ? ["start", "--port", "3000"]
  : ["dev", "--turbopack", "--port", "3000"], production && existsSync(new URL("../.next-preview/BUILD_ID", import.meta.url))
    ? { ...process.env, STUDYSPREE_PREVIEW_BUILD: "1" } : process.env);
run("./maintenance.mjs");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => close());
