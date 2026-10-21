import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

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
function run(script, args = []) {
  const child = spawn(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...args], { cwd: root, stdio: "inherit", env: process.env });
  children.push(child);
  child.on("error", () => { console.error("Local development process could not start."); close(1); });
  child.on("exit", code => close(code ?? 1));
}
const production = process.argv.includes("--production");
run("../node_modules/next/dist/bin/next", production
  ? ["start", "--port", "3000"]
  : ["dev", "--turbopack", "--port", "3000"]);
run("./maintenance.mjs");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => close());
