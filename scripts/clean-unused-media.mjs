import { readdir, readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { resolve, relative, dirname, join, sep } from "node:path";

// Dry run by default. Archive inactive versioned media outside public, retaining
// runtime URLs, test fixtures and source GIFs needed by the retiming pipeline.
const root = resolve("."), publicRoot = resolve("public"), archive = resolve(".tmp/unused-media-20261018");
const revisions = JSON.parse(await readFile("src/lib/characters/mediaRevisions.json", "utf8"));
const keep = new Set();
for (const [slug, revision] of Object.entries(revisions)) {
  for (const name of [`study-${revision.version}.gif`, `poster-${revision.posterVersion}.webp`, ...(revision.video ? [`study-${revision.version}.mp4`, `study-${revision.version}.webm`] : []), ...(revision.sourceVersion ? [`study-${revision.sourceVersion}.gif`] : [])]) keep.add(`characters/${slug}/${name}`);
}
keep.add("characters/tesla/study-v5.mp4"); // Current continuous-video production input.
keep.add("characters/einstein/study-v1.gif"); // Reproduces the v12 writing input to v14.
keep.add("characters/einstein/study-v12.gif"); // Reproduces the stabilized v14 input to v16.
keep.add("characters/tesla/study-v12.gif");
for (const slug of ["einstein","tesla"]) keep.add(`characters/${slug}/study-v14.gif`); // Reproducible hand-rig source.
const sources = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (/\.(?:ts|tsx|mjs|json|sh)$/.test(entry.name) && !["ambience-sources.json", "mediaRevisions.json", "clean-unused-media.mjs"].includes(entry.name)) sources.push(await readFile(path, "utf8"));
  }
}
for (const directory of ["src", "e2e", "scripts"]) await scan(directory);
const code = sources.join("\n");
const effects = await readFile("src/lib/audio/effects.ts", "utf8");
for (const match of effects.matchAll(/\/audio\/([^"`]+\.(?:mp3|wav|webm))/g)) keep.add(`audio/${match[1]}`);
const candidates = [];
for (const [slug] of Object.entries(revisions)) for (const name of await readdir(`public/characters/${slug}`)) {
  const path = `characters/${slug}/${name}`;
  if (/\.(gif|webp|webm|mp4)$/.test(name) && !keep.has(path) && !code.includes(`/characters/${slug}/${name}`)) candidates.push(path);
}
for (const name of await readdir("public/audio")) {
  const path = `audio/${name}`;
  if (/\.mp3$/.test(name) && !keep.has(path) && !code.includes(name)) candidates.push(path);
}
if (process.argv.includes("--apply")) {
  for (const path of candidates) {
    const source = resolve(publicRoot, path), target = resolve(archive, path);
    // Verify both resolved targets before any move. Never follow user paths.
    if (!source.startsWith(publicRoot + sep) || !target.startsWith(archive + sep)) throw new Error("Unsafe media path");
    await mkdir(dirname(target), { recursive: true });
    await rename(source, target);
  }
  // Keep the preparation catalog focused on currently available outputs.
  const catalogPath = "scripts/ambience-sources.json", catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  await writeFile(catalogPath, JSON.stringify(catalog.filter(entry => !candidates.includes(`audio/${entry.file}`)), null, 2) + "\n");
  const report = `# Inactive media cleanup\n\nArchived ${candidates.length} inactive assets outside public under the ignored .tmp directory. Runtime assets, matching posters, retiming inputs and regression fixtures are retained. Saved sessions store character slugs, so their selections and banked time are unchanged. Licence/provenance history is retained.\n\n${candidates.map(path => `- ${relative(root, join(publicRoot, path))}`).join("\n")}\n`;
  let previous = "";
  try { previous = await readFile("docs/MEDIA_CLEANUP.md", "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  await writeFile("docs/MEDIA_CLEANUP.md", previous ? `${previous}\n## Additional cleanup\n\n${report.split("\n").slice(2).join("\n")}` : report);
}
console.log(`${process.argv.includes("--apply") ? "Archived" : "Would archive"} ${candidates.length} inactive assets.`);
console.log(candidates.join("\n"));
