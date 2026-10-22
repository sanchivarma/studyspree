import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
// Build separately from the production app already serving localhost:3000.
const child = spawn(process.execPath, [fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)), "build"], {
  cwd: fileURLToPath(new URL("../", import.meta.url)), env: { ...process.env, STUDYSPREE_PREVIEW_BUILD: "1" }, stdio: "inherit", windowsHide: true,
});
child.on("error", () => { process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
