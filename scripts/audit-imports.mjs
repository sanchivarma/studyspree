import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
function sourceFiles(directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(file) : /\.(tsx?|json|css)$/.test(file) ? [file] : [];
  });
}
const files = sourceFiles("src");
const known = new Set(files);
function resolveImport(from, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return undefined;
  const base = specifier.startsWith("@/") ? `src/${specifier.slice(2)}` : path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  return [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`].find(file => known.has(file));
}
const nodes = {};
for (const file of files) {
  const source = readFileSync(path.join(root, file), "utf8");
  const node = nodes[file] = { bytes: Buffer.byteLength(source), lines: source.split("\n").length,
    client: /^[\s\r\n]*["']use client["']/.test(source), imports: [], dynamic: [], external: [] };
  if (!/\.tsx?$/.test(file)) continue;
  const syntax = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(statement) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      if (statement.isTypeOnly || statement.importClause?.isTypeOnly) return;
      const clause = statement.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings) && !clause.name && clause.namedBindings.elements.length && clause.namedBindings.elements.every(element => element.isTypeOnly)) return;
      const specifier = statement.moduleSpecifier.text;
      const resolved = resolveImport(file, specifier);
      if (resolved) node.imports.push(resolved);
      else node.external.push(specifier);
    }
    if (ts.isCallExpression(statement) && statement.expression.kind === ts.SyntaxKind.ImportKeyword && statement.arguments[0] && ts.isStringLiteral(statement.arguments[0])) {
      node.dynamic.push(resolveImport(file, statement.arguments[0].text) ?? statement.arguments[0].text);
    }
    ts.forEachChild(statement, visit);
  }
  visit(syntax);
}
function closure(file, seen = new Set()) {
  if (seen.has(file) || !nodes[file]) return seen;
  seen.add(file);
  for (const dependency of nodes[file].imports) closure(dependency, seen);
  return seen;
}
const entries = files.filter(file => nodes[file].client).map(file => {
  const modules = [...closure(file)];
  return { file, modules: modules.length, bytes: modules.reduce((sum, dependency) => sum + nodes[dependency].bytes, 0),
    packages: [...new Set(modules.flatMap(dependency => nodes[dependency].external))].sort() };
}).sort((a, b) => b.modules - a.modules);
const report = { sourceFiles: files.length, totalBytes: Object.values(nodes).reduce((sum, node) => sum + node.bytes, 0), entries, nodes };
mkdirSync(path.join(root, ".tmp"), { recursive: true });
writeFileSync(process.env.IMPORT_AUDIT_OUTPUT ?? path.join(root, ".tmp/import-audit.json"), JSON.stringify(report, null, 2));
console.log("Static local-source dependencies; dynamic chunks and external packages are listed separately, not counted as downloaded bundle bytes.");
console.table(entries.slice(0, 20).map(({ file, modules, bytes }) => ({ file, modules, bytes })));
