import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/supabase/dist/supabase.js'),
  'gen', 'types', '--local', '--schema', 'public'], { cwd: root, encoding: 'utf8' });
if (result.error || result.status !== 0 || !result.stdout.startsWith('export type Json')) {
  console.error('Database type generation needs a running local Supabase database. Existing types were retained.');
  process.exit(1);
}
writeFileSync(resolve(root, 'src/types/database.ts'), result.stdout);
console.log('Generated src/types/database.ts from the local database.');
