import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/supabase/dist/supabase.js'),
  'gen', 'types', '--local', '--schema', 'public'], { cwd: root, encoding: 'utf8' });
// Recent CLI versions prefix successful output with a blank line.
const generated = result.stdout?.trimStart() ?? '';
if (result.error || result.status !== 0 || !generated.startsWith('export type Json')) {
  console.error('Database type generation needs a running local Supabase database. Existing types were retained.');
  process.exit(1);
}
const source = ts.createSourceFile('database.ts', generated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const formatted = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(source);
writeFileSync(resolve(root, 'src/types/database.ts'), formatted);
console.log('Generated src/types/database.ts from the local database.');
