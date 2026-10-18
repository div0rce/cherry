import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'repo', 'engine-prisma');

function run(root: string): { status: number | null; output: string } {
  const result = spawnSync('npm', ['run', 'check:engine-prisma', '--', '--root', root], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function runSource(file: string, source: string): { status: number | null; output: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-engine-prisma-'));
  try {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), source);
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const { status, output } = run(fixtureRoot);
  assert.notEqual(status, 0, `expected guardrail to fail for fixture, got status=${status ?? 'null'}`);
  assert.equal(output.includes("value-imports '@prisma/client'"), true, `expected import violation, got: ${output}`);
}

const BAD: Array<{ file: string; source: string; message: string }> = [
  { file: 'lib/authority/a.ts', source: "import '@prisma/client';\n", message: "loads '@prisma/client'" },
  {
    file: 'lib/authority/b.ts',
    source: "export async function f(): Promise<unknown> {\n  return import('@prisma/client');\n}\n",
    message: "loads '@prisma/client'",
  },
  {
    file: 'lib/engine/c.ts',
    source: "const p = require('@prisma/client');\nvoid p;\n",
    message: "loads '@prisma/client'",
  },
  {
    file: 'lib/engine/d.ts',
    source: "export { prisma as db } from '../prisma.js';\n",
    message: 'imports lib/prisma',
  },
  {
    file: 'lib/authority/e.ts',
    source: "export async function f(): Promise<unknown> {\n  return import('../prisma.js');\n}\n",
    message: 'imports lib/prisma',
  },
];
for (const { file, source, message } of BAD) {
  const { status, output } = runSource(file, source);
  assert.notEqual(status, 0, `expected ${file} to fail: ${source}`);
  assert.equal(output.includes(`${file}:`) && output.includes(message), true, `expected '${message}' for ${file}, got: ${output}`);
}

{
  const { status, output } = runSource('lib/engine/ok.ts', "import type { Bucket } from '@prisma/client';\nexport type B = Bucket;\n");
  assert.equal(status, 0, `expected type-only import to pass, got: ${output}`);
}

// Comments that mention imports load nothing and must not fail the check.
{
  const source = [
    "// require('@prisma/client')",
    "/* import('../prisma.js') and import '@prisma/client'; */",
    "/**",
    " * export { prisma } from '../prisma.js';",
    " */",
    'export const x = 1;',
    '',
  ].join('\n');
  const { status, output } = runSource('lib/authority/commented.ts', source);
  assert.equal(status, 0, `expected commented-out imports to pass, got: ${output}`);
}

process.stdout.write('engine-prisma-import: ok\n');
