import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function validateAudioLicences(files: string[], markdown: string, certificateExists: (path: string) => boolean): string[] {
  const rows = markdown.split(/\r?\n/).filter(line => line.startsWith("|"))
    .map(line => line.split("|").slice(1, -1).map(cell => cell.trim().replace(/`/g, "")));
  const entries = rows.filter(row => files.includes(row[0]));
  const errors: string[] = [];
  for (const file of files) {
    const matches = entries.filter(row => row[0] === file);
    if (matches.length !== 1) { errors.push(`${file}: expected one recorded licence entry`); continue; }
    const row = matches[0];
    if (row.length !== 6 || row.some(cell => !cell)) errors.push(`${file}: incomplete licence metadata`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row[3] ?? "")) errors.push(`${file}: invalid recorded date`);
    if (row[4]?.toLowerCase() !== "yes") errors.push(`${file}: commercial app use is not permitted`);
    if (!row[5] || !certificateExists(row[5])) errors.push(`${file}: licence certificate is missing`);
  }
  return errors;
}

// Node 22 strips these types directly; no extra build tool or dependency.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const directory = resolve(root, "public/audio");
  const collect = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error("Audio licence checks do not follow symbolic links");
    return entry.isDirectory() ? collect(resolve(directory, entry.name)) : [resolve(directory, entry.name)];
  });
  const files = collect(directory).map(path => relative(directory, path).split(sep).join("/")).filter(path => path !== "LICENCES.md");
  const errors = validateAudioLicences(files, readFileSync(resolve(directory, "LICENCES.md"), "utf8"), path => {
    const absolute = resolve(root, path); const within = relative(root, absolute);
    return !within.startsWith("..") && !within.startsWith(sep) && existsSync(absolute) && statSync(absolute).isFile();
  });
  if (errors.length) { errors.forEach(error => console.error(error)); process.exitCode = 1; }
  else console.log(`Audio licences verified (${files.length} files).`);
}
